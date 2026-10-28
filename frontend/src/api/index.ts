// Screens import `client` from here. Flip this seam when the mock is retired.
import type { FlowForgeClient } from './client'
import { httpClient } from './httpClient'

export const client: FlowForgeClient = httpClient
export { httpClient }

export type { FlowForgeClient } from './client'
export type {
  ExecutionStatus,
  ExecutionStep,
  ExecutionSummary,
  TriggerKind,
  WorkflowStatus,
  WorkflowSummary,
} from './client'
