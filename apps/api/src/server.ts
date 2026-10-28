import Fastify from "fastify";
import cors from "@fastify/cors";
import { Prisma, prisma } from "@flowforge/db";
import { validateFlowStructure } from "@flowforge/engine";
import { listNodeTypes } from "@flowforge/nodes";
import { flowDefinitionSchema } from "@flowforge/shared";
import { getDevUserId } from "./devUser.js";
import {
  fromUiStatus,
  parseFlow,
  toSummary,
  type UiWorkflowStatus,
} from "./mapWorkflow.js";
import { mapExecStatus, mapNodeStatus, runWorkflowExecution } from "./runExecution.js";
import { startScheduleRunner } from "./scheduleRunner.js";

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

const port = Number(process.env.API_PORT ?? 3001);

async function main() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    // Reflect the browser origin in local/dev so PATCH/POST preflights succeed.
    origin: true,
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  app.get("/health", async () => ({ status: "ok", service: "flowforge-api" }));

  app.get("/ready", async (_req, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return reply.send({ status: "ready", database: "up" });
    } catch (err) {
      return reply.status(503).send({
        status: "not-ready",
        database: "down",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  });

  app.get("/api/v1/node-types", async () => ({ items: listNodeTypes() }));

  /** Inspect the Postgres content calendar (Sheets stand-in for Content Pipeline). */
  app.get<{ Params: { spreadsheetId: string }; Querystring: { sheet?: string } }>(
    "/api/v1/content-calendars/:spreadsheetId",
    async (req, reply) => {
      const spreadsheetId = req.params.spreadsheetId;
      const calendar = await prisma.contentCalendar.findUnique({
        where: { spreadsheetId },
      });
      if (!calendar) {
        return reply.status(404).send({
          code: "NOT_FOUND",
          message: `No content calendar for spreadsheetId "${spreadsheetId}". It is created on first Sheets read/append.`,
        });
      }
      const rows = await prisma.contentCalendarRow.findMany({
        where: {
          calendarId: calendar.id,
          ...(req.query.sheet ? { sheet: req.query.sheet } : {}),
        },
        orderBy: [{ sheet: "asc" }, { rowIndex: "asc" }],
      });
      return {
        spreadsheetId: calendar.spreadsheetId,
        title: calendar.title,
        note: "This is FlowForge's Postgres content calendar — not a Google Sheets document. Put content-calendar in Spreadsheet ID.",
        sheets: [...new Set(rows.map((r) => r.sheet))],
        rows: rows.map((r) => ({
          id: r.id,
          sheet: r.sheet,
          rowIndex: r.rowIndex,
          data: r.data,
          updatedAt: r.updatedAt.toISOString(),
        })),
      };
    },
  );

  app.get("/api/v1/workflows", async () => {
    const userId = await getDevUserId();
    const rows = await prisma.workflow.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
    return { items: rows.map((w) => toSummary(w)) };
  });

  app.post<{ Body: { name?: string; graph?: unknown } }>("/api/v1/workflows", async (req, reply) => {
    const userId = await getDevUserId();
    const name = (req.body?.name ?? "Untitled workflow").trim() || "Untitled workflow";
    const graphParse = req.body?.graph
      ? flowDefinitionSchema.safeParse(req.body.graph)
      : { success: true as const, data: { schemaVersion: 1 as const, nodes: [], edges: [] } };
    if (!graphParse.success) {
      return reply.status(400).send({
        code: "INVALID_GRAPH",
        message: "Workflow graph failed validation",
        details: graphParse.error.flatten(),
      });
    }

    const created = await prisma.workflow.create({
      data: {
        userId,
        name,
        status: "DRAFT",
        graphJson: asJson(graphParse.data),
      },
    });
    return reply.status(201).send(toSummary(created));
  });

  app.get<{ Params: { id: string } }>("/api/v1/workflows/:id", async (req, reply) => {
    const userId = await getDevUserId();
    const workflow = await prisma.workflow.findFirst({
      where: { id: req.params.id, userId },
    });
    if (!workflow) {
      return reply.status(404).send({ code: "NOT_FOUND", message: "Workflow not found" });
    }
    return {
      ...toSummary(workflow),
      graph: parseFlow(workflow.graphJson),
    };
  });

  app.patch<{
    Params: { id: string };
    Body: { name?: string; status?: UiWorkflowStatus; graph?: unknown };
  }>("/api/v1/workflows/:id", async (req, reply) => {
    const userId = await getDevUserId();
    const existing = await prisma.workflow.findFirst({
      where: { id: req.params.id, userId },
    });
    if (!existing) {
      return reply.status(404).send({ code: "NOT_FOUND", message: "Workflow not found" });
    }

    let graphJson: Prisma.InputJsonValue | undefined;
    if (req.body?.graph !== undefined) {
      const parsed = flowDefinitionSchema.safeParse(req.body.graph);
      if (!parsed.success) {
        return reply.status(400).send({
          code: "INVALID_GRAPH",
          message: "Workflow graph failed validation",
          details: parsed.error.flatten(),
        });
      }
      graphJson = asJson(parsed.data);
    }

    const nextStatus = req.body?.status ? fromUiStatus(req.body.status) : undefined;
    if (nextStatus === "ACTIVE") {
      const flow = parseFlow(graphJson ?? existing.graphJson);
      const scheduleNode = flow.nodes.find((n) => n.type === "trigger.schedule");
      if (!scheduleNode) {
        return reply.status(400).send({
          code: "HOST_REQUIRES_SCHEDULE",
          message: "Hosting requires a Schedule trigger on the canvas.",
        });
      }
      const last = await prisma.execution.findFirst({
        where: { workflowId: existing.id },
        orderBy: { createdAt: "desc" },
      });
      if (!last || last.status !== "SUCCEEDED") {
        return reply.status(400).send({
          code: "HOST_REQUIRES_GREEN_RUN",
          message: "Run a successful Test run before hosting this automation.",
        });
      }
    }

    const updated = await prisma.workflow.update({
      where: { id: existing.id },
      data: {
        name: req.body?.name?.trim() || undefined,
        status: nextStatus,
        graphJson,
        graphVersion: req.body?.graph !== undefined ? { increment: 1 } : undefined,
        lastActivatedAt: nextStatus === "ACTIVE" ? new Date() : undefined,
      },
    });
    return toSummary(updated);
  });

  app.delete<{ Params: { id: string } }>("/api/v1/workflows/:id", async (req, reply) => {
    const userId = await getDevUserId();
    const existing = await prisma.workflow.findFirst({
      where: { id: req.params.id, userId },
    });
    if (!existing) {
      return reply.status(404).send({ code: "NOT_FOUND", message: "Workflow not found" });
    }
    await prisma.workflow.delete({ where: { id: existing.id } });
    return reply.status(204).send();
  });

  app.post<{ Params: { id: string } }>("/api/v1/workflows/:id/duplicate", async (req, reply) => {
    const userId = await getDevUserId();
    const existing = await prisma.workflow.findFirst({
      where: { id: req.params.id, userId },
    });
    if (!existing) {
      return reply.status(404).send({ code: "NOT_FOUND", message: "Workflow not found" });
    }
    const copy = await prisma.workflow.create({
      data: {
        userId,
        name: `${existing.name} (copy)`,
        status: "DRAFT",
        graphJson: asJson(existing.graphJson ?? { schemaVersion: 1, nodes: [], edges: [] }),
      },
    });
    return reply.status(201).send(toSummary(copy));
  });

  app.post<{ Params: { id: string }; Body: { trigger?: unknown } }>(
    "/api/v1/workflows/:id/run",
    async (req, reply) => {
      const userId = await getDevUserId();
      const workflow = await prisma.workflow.findFirst({
        where: { id: req.params.id, userId },
      });
      if (!workflow) {
        return reply.status(404).send({ code: "NOT_FOUND", message: "Workflow not found" });
      }

      const flow = parseFlow(workflow.graphJson);
      const issues = validateFlowStructure(flow);
      if (issues.length) {
        return reply.status(400).send({
          code: "INVALID_GRAPH",
          message: issues.map((i) => i.message).join("; "),
          details: issues,
        });
      }

      try {
        const result = await runWorkflowExecution({
          workflowId: workflow.id,
          userId,
          workflowName: workflow.name,
          flow,
          triggerType: "MANUAL",
          trigger:
            req.body?.trigger ??
            ({ startedAt: new Date().toISOString(), source: "manual" } as const),
          triggerLabel: "Manual",
        });
        return result;
      } catch (err) {
        const code = (err as { code?: string }).code;
        if (code === "INVALID_GRAPH" || code === "EMPTY_WORKFLOW") {
          return reply.status(400).send({
            code,
            message: err instanceof Error ? err.message : String(err),
            details: (err as { details?: unknown }).details,
          });
        }
        throw err;
      }
    },
  );

  app.get<{ Querystring: { workflowId?: string } }>("/api/v1/executions", async (req) => {
    const userId = await getDevUserId();
    const rows = await prisma.execution.findMany({
      where: {
        userId,
        ...(req.query.workflowId ? { workflowId: req.query.workflowId } : {}),
      },
      include: {
        workflow: true,
        nodeExecutions: { orderBy: { sequence: "asc" } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return {
      items: rows.map((row) => ({
        id: row.id,
        workflowId: row.workflowId,
        workflowName: row.workflow.name,
        status: mapExecStatus(row.status),
        trigger:
          row.triggerType === "WEBHOOK"
            ? "Webhook"
            : row.triggerType === "SCHEDULE"
              ? "Schedule"
              : "Manual",
        startedAt: (row.startedAt ?? row.createdAt).toISOString(),
        durationMs: row.durationMs,
        error: row.errorMessage ?? undefined,
        steps: row.nodeExecutions.map((step) => ({
          id: step.nodeId,
          label: step.nodeType,
          status: mapNodeStatus(step.status),
          durationMs: step.durationMs,
          log:
            step.errorMessage ??
            (Array.isArray(step.logs)
              ? (step.logs as Array<{ message?: string }>)
                  .map((l) => l.message ?? "")
                  .filter(Boolean)
                  .join("\n")
              : step.outputData
                ? JSON.stringify(step.outputData)
                : ""),
        })),
      })),
    };
  });

  const stopScheduler = startScheduleRunner(app.log);
  app.addHook("onClose", async () => {
    stopScheduler();
  });

  await app.listen({ port, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
