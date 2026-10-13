// The seam: screens import `client` from here and never touch fetch,
// localStorage, or any adapter directly. Flip this one line to go live.
import type { FlowForgeClient } from './client';
import { mockClient } from './mockClient';

export const client: FlowForgeClient = mockClient;

export type { FlowForgeClient } from './client';
export type {
  ExecutionStatus,
  ExecutionStep,
  ExecutionSummary,
  TriggerKind,
  WorkflowStatus,
  WorkflowSummary,
} from './client';
