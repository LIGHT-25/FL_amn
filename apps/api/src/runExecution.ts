import { Prisma, prisma } from "@flowforge/db";
import { executeFlow, validateFlowStructure } from "@flowforge/engine";
import type { FlowDefinition } from "@flowforge/shared";

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export type ExecutionStatusUi = "success" | "failed" | "running" | "waiting";

export function mapExecStatus(status: string): ExecutionStatusUi {
  switch (status) {
    case "SUCCEEDED":
      return "success";
    case "FAILED":
      return "failed";
    case "RUNNING":
    case "QUEUED":
      return "running";
    default:
      return "waiting";
  }
}

export function mapNodeStatus(status: string): ExecutionStatusUi {
  switch (status) {
    case "SUCCEEDED":
      return "success";
    case "FAILED":
      return "failed";
    case "RUNNING":
      return "running";
    default:
      return "waiting";
  }
}

export type RunExecutionResult = {
  id: string;
  workflowId: string;
  workflowName: string;
  status: ExecutionStatusUi;
  trigger: string;
  startedAt: string;
  durationMs: number | null;
  error?: string;
  steps: Array<{
    id: string;
    label: string;
    status: ExecutionStatusUi;
    durationMs: number | null;
    log: string;
  }>;
};

export async function runWorkflowExecution(params: {
  workflowId: string;
  userId: string;
  workflowName: string;
  flow: FlowDefinition;
  triggerType: "MANUAL" | "WEBHOOK" | "SCHEDULE";
  trigger: unknown;
  triggerLabel: string;
}): Promise<RunExecutionResult> {
  const issues = validateFlowStructure(params.flow);
  if (issues.length) {
    throw Object.assign(new Error(issues.map((i) => i.message).join("; ")), {
      code: "INVALID_GRAPH",
      details: issues,
    });
  }
  if (params.flow.nodes.length === 0) {
    throw Object.assign(new Error("Add at least one node before running"), {
      code: "EMPTY_WORKFLOW",
    });
  }

  const execution = await prisma.execution.create({
    data: {
      workflowId: params.workflowId,
      userId: params.userId,
      triggerType: params.triggerType,
      status: "RUNNING",
      workflowSnapshot: asJson(params.flow),
      triggerData: asJson(params.trigger),
      startedAt: new Date(),
    },
  });

  const result = await executeFlow(params.flow, {
    trigger: params.trigger,
    env: process.env,
  });

  await prisma.$transaction([
    prisma.execution.update({
      where: { id: execution.id },
      data: {
        status: result.status === "SUCCEEDED" ? "SUCCEEDED" : "FAILED",
        finishedAt: new Date(result.finishedAt),
        durationMs: result.durationMs,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
      },
    }),
    ...result.nodes.map((node, index) =>
      prisma.nodeExecution.create({
        data: {
          executionId: execution.id,
          nodeId: node.nodeId,
          nodeType: node.nodeType,
          status: node.status,
          inputData: node.input === undefined ? undefined : asJson(node.input),
          outputData: node.output === undefined ? undefined : asJson(node.output),
          logs: asJson(node.logs),
          errorCode: node.errorCode,
          errorMessage: node.errorMessage,
          startedAt: new Date(node.startedAt),
          finishedAt: new Date(node.finishedAt),
          durationMs: node.durationMs,
          sequence: index,
        },
      }),
    ),
  ]);

  return {
    id: execution.id,
    workflowId: params.workflowId,
    workflowName: params.workflowName,
    status: mapExecStatus(result.status),
    trigger: params.triggerLabel,
    startedAt: result.startedAt,
    durationMs: result.durationMs,
    error: result.errorMessage,
    steps: result.nodes.map((node) => ({
      id: node.nodeId,
      label: node.name,
      status: mapNodeStatus(node.status),
      durationMs: node.durationMs,
      log:
        node.errorMessage ??
        node.logs.map((l) => l.message).join("\n") ??
        (node.output ? JSON.stringify(node.output) : ""),
    })),
  };
}
