import { prisma } from "@flowforge/db";
import { Cron } from "croner";
import { parseFlow } from "./mapWorkflow.js";
import { runWorkflowExecution } from "./runExecution.js";

const lastFiredMinute = new Map<string, string>();
const running = new Set<string>();

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function inActiveWindow(now: Date, activeFrom?: string, activeUntil?: string): boolean {
  if (activeFrom) {
    const from = new Date(activeFrom);
    if (!Number.isNaN(from.getTime()) && now < from) return false;
  }
  if (activeUntil) {
    const until = new Date(activeUntil);
    if (!Number.isNaN(until.getTime()) && now > until) return false;
  }
  return true;
}

function minuteKey(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 16);
  }
}

function isDueThisMinute(cronExpr: string, timeZone: string, now: Date): boolean {
  try {
    const job = new Cron(cronExpr, { timezone: timeZone, paused: true });
    const prev = job.previousRuns(1, now)[0];
    if (!prev) return false;
    // Fire if the previous scheduled instant falls within the last ~65s.
    return now.getTime() - prev.getTime() < 65_000;
  } catch {
    return false;
  }
}

async function tick(log: { info: (o: object, msg?: string) => void; error: (o: object, msg?: string) => void }) {
  const workflows = await prisma.workflow.findMany({
    where: { status: "ACTIVE" },
  });

  const now = new Date();

  for (const workflow of workflows) {
    if (running.has(workflow.id)) continue;

    const flow = parseFlow(workflow.graphJson);
    const scheduleNode = flow.nodes.find((n) => n.type === "trigger.schedule");
    if (!scheduleNode) continue;

    const cron = asString(scheduleNode.config.cron, "0 9 * * *");
    const timezone = asString(scheduleNode.config.timezone, "UTC") || "UTC";
    const activeFrom = asString(scheduleNode.config.activeFrom).trim() || undefined;
    const activeUntil = asString(scheduleNode.config.activeUntil).trim() || undefined;

    if (!inActiveWindow(now, activeFrom, activeUntil)) continue;
    if (!isDueThisMinute(cron, timezone, now)) continue;

    const key = `${workflow.id}:${minuteKey(now, timezone)}`;
    if (lastFiredMinute.get(workflow.id) === key) continue;

    lastFiredMinute.set(workflow.id, key);
    running.add(workflow.id);

    const trigger = {
      source: "schedule",
      cron,
      timezone,
      activeFrom,
      activeUntil,
      startedAt: now.toISOString(),
    };

    void runWorkflowExecution({
      workflowId: workflow.id,
      userId: workflow.userId,
      workflowName: workflow.name,
      flow,
      triggerType: "SCHEDULE",
      trigger,
      triggerLabel: "Schedule",
    })
      .then((result) => {
        log.info(
          { workflowId: workflow.id, executionId: result.id, status: result.status },
          "Scheduled workflow run finished",
        );
      })
      .catch((err) => {
        log.error(
          { workflowId: workflow.id, err: err instanceof Error ? err.message : String(err) },
          "Scheduled workflow run failed",
        );
      })
      .finally(() => {
        running.delete(workflow.id);
      });
  }
}

/** Poll ACTIVE schedule workflows once per minute (in-process). */
export function startScheduleRunner(log: {
  info: (o: object, msg?: string) => void;
  error: (o: object, msg?: string) => void;
}): () => void {
  log.info({}, "Schedule runner started (1m tick)");
  const interval = setInterval(() => {
    void tick(log).catch((err) => {
      log.error({ err: err instanceof Error ? err.message : String(err) }, "Schedule tick failed");
    });
  }, 60_000);

  // First pass shortly after boot so a due cron isn't delayed a full minute.
  const boot = setTimeout(() => {
    void tick(log).catch(() => undefined);
  }, 5_000);

  return () => {
    clearInterval(interval);
    clearTimeout(boot);
  };
}
