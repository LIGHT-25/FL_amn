import type {
  ExecutionSummary,
  FlowForgeClient,
  WorkflowStatus,
  WorkflowSummary,
} from './client'

// Empty string = same-origin via Vite proxy (/api → localhost:3001).
// Set VITE_API_URL only when the UI must talk to the API directly.
const API_URL = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '')

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  if (res.status === 204) return undefined as T
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = typeof body?.message === 'string' ? body.message : `HTTP ${res.status}`
    throw new Error(message)
  }
  return body as T
}

export type WorkflowDetail = WorkflowSummary & {
  graph?: {
    schemaVersion: 1
    nodes: Array<{
      id: string
      type: string
      typeVersion: number
      name: string
      position: { x: number; y: number }
      config: Record<string, unknown>
    }>
    edges: Array<{
      id: string
      source: string
      sourceHandle?: string
      target: string
      targetHandle?: string
    }>
  }
}

export type FlowGraphPayload = NonNullable<WorkflowDetail['graph']>

export const httpClient: FlowForgeClient & {
  getWorkflowDetail(id: string): Promise<WorkflowDetail | undefined>
  saveWorkflowGraph(id: string, graph: FlowGraphPayload, name?: string): Promise<WorkflowSummary>
  runWorkflow(id: string): Promise<ExecutionSummary>
} = {
  async listWorkflows() {
    const data = await request<{ items: WorkflowSummary[] }>('/api/v1/workflows')
    return data.items
  },

  async getWorkflow(id) {
    try {
      const detail = await request<WorkflowDetail>(`/api/v1/workflows/${id}`)
      return detail
    } catch {
      return undefined
    }
  },

  async getWorkflowDetail(id) {
    try {
      return await request<WorkflowDetail>(`/api/v1/workflows/${id}`)
    } catch {
      return undefined
    }
  },

  async createWorkflow(name, graph) {
    return request<WorkflowSummary>('/api/v1/workflows', {
      method: 'POST',
      body: JSON.stringify({ name, graph }),
    })
  },

  async renameWorkflow(id, name) {
    return request<WorkflowSummary>(`/api/v1/workflows/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    })
  },

  async setWorkflowStatus(id, status: WorkflowStatus) {
    return request<WorkflowSummary>(`/api/v1/workflows/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
  },

  async duplicateWorkflow(id) {
    return request<WorkflowSummary>(`/api/v1/workflows/${id}/duplicate`, { method: 'POST' })
  },

  async deleteWorkflow(id) {
    await request<void>(`/api/v1/workflows/${id}`, { method: 'DELETE' })
  },

  async setStarred(id, _starred) {
    // Starred is not persisted yet; return current summary.
    const wf = await this.getWorkflow(id)
    if (!wf) throw new Error('Workflow not found')
    return wf
  },

  async listExecutions(workflowId) {
    const qs = workflowId ? `?workflowId=${encodeURIComponent(workflowId)}` : ''
    const data = await request<{ items: ExecutionSummary[] }>(`/api/v1/executions${qs}`)
    return data.items
  },

  async saveWorkflowGraph(id, graph, name) {
    return request<WorkflowSummary>(`/api/v1/workflows/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ graph, name }),
    })
  },

  async runWorkflow(id) {
    return request<ExecutionSummary>(`/api/v1/workflows/${id}/run`, {
      method: 'POST',
      body: JSON.stringify({ trigger: { source: 'manual', startedAt: new Date().toISOString() } }),
    })
  },
}
