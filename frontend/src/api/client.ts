// Data contracts for the FlowForge backend (mirrors docs/02-sdd §12).
// Screens depend only on this interface. Today it is satisfied by the mock
// adapter (mockClient.ts); when auth/CRUD land, an HTTP adapter takes over
// without touching any component.

export type WorkflowStatus = 'active' | 'inactive';

export type TriggerKind = 'manual' | 'webhook' | 'schedule';

export interface WorkflowSummary {
  id: string;
  name: string;
  starred: boolean;
  status: WorkflowStatus;
  triggerKind: TriggerKind;
  triggerLabel: string;
  stepCount: number;
  updatedAt: string; // ISO timestamp
  owner: string;
}

export type ExecutionStatus = 'success' | 'failed' | 'running' | 'waiting';

export interface ExecutionStep {
  id: string;
  label: string;
  status: ExecutionStatus;
  durationMs: number | null;
  log: string;
}

export interface ExecutionSummary {
  id: string;
  workflowId: string;
  workflowName: string;
  status: ExecutionStatus;
  trigger: string;
  startedAt: string; // ISO timestamp
  durationMs: number | null;
  error?: string;
  steps: ExecutionStep[];
}

export interface FlowForgeClient {
  listWorkflows(): Promise<WorkflowSummary[]>;
  getWorkflow(id: string): Promise<WorkflowSummary | undefined>;
  createWorkflow(name: string): Promise<WorkflowSummary>;
  renameWorkflow(id: string, name: string): Promise<WorkflowSummary>;
  setWorkflowStatus(id: string, status: WorkflowStatus): Promise<WorkflowSummary>;
  duplicateWorkflow(id: string): Promise<WorkflowSummary>;
  deleteWorkflow(id: string): Promise<void>;
  setStarred(id: string, starred: boolean): Promise<WorkflowSummary>;
  listExecutions(workflowId?: string): Promise<ExecutionSummary[]>;
}
