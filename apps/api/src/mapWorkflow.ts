import type { FlowDefinition } from "@flowforge/shared";
import { flowDefinitionSchema } from "@flowforge/shared";
import type { Workflow, WorkflowStatus as DbWorkflowStatus } from "@flowforge/db";

export type UiWorkflowStatus = "active" | "inactive";
export type UiTriggerKind = "manual" | "webhook" | "schedule";

export type WorkflowSummaryDto = {
  id: string;
  name: string;
  starred: boolean;
  status: UiWorkflowStatus;
  triggerKind: UiTriggerKind;
  triggerLabel: string;
  stepCount: number;
  updatedAt: string;
  owner: string;
};

function emptyFlow(): FlowDefinition {
  return { schemaVersion: 1, nodes: [], edges: [] };
}

export function parseFlow(graphJson: unknown): FlowDefinition {
  const parsed = flowDefinitionSchema.safeParse(graphJson);
  return parsed.success ? parsed.data : emptyFlow();
}

export function toUiStatus(status: DbWorkflowStatus): UiWorkflowStatus {
  return status === "ACTIVE" ? "active" : "inactive";
}

export function fromUiStatus(status: UiWorkflowStatus): DbWorkflowStatus {
  return status === "active" ? "ACTIVE" : "INACTIVE";
}

function detectTrigger(flow: FlowDefinition): { kind: UiTriggerKind; label: string } {
  const trigger = flow.nodes.find((n) => n.type.startsWith("trigger."));
  if (!trigger) return { kind: "manual", label: "No trigger" };
  if (trigger.type === "trigger.webhook") return { kind: "webhook", label: "Webhook" };
  if (trigger.type === "trigger.schedule") return { kind: "schedule", label: "Schedule" };
  return { kind: "manual", label: "Manual" };
}

export function toSummary(workflow: Workflow, ownerName = "Dev User"): WorkflowSummaryDto {
  const flow = parseFlow(workflow.graphJson);
  const trigger = detectTrigger(flow);
  return {
    id: workflow.id,
    name: workflow.name,
    starred: false,
    status: toUiStatus(workflow.status),
    triggerKind: trigger.kind,
    triggerLabel: trigger.label,
    stepCount: flow.nodes.length,
    updatedAt: workflow.updatedAt.toISOString(),
    owner: ownerName,
  };
}
