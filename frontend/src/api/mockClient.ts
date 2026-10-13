// Mock adapter behind the FlowForgeClient seam. Seed data mirrors the four
// use cases from the platform scope doc; state persists to localStorage.
// Delete this file (and point `client` at the HTTP adapter) once the real
// API slices land — no screen changes required.

import type {
  ExecutionSummary,
  FlowForgeClient,
  WorkflowStatus,
  WorkflowSummary,
} from './client';
import { mockUser } from './mockUser';

const STORE_KEY = 'flowforge-mock-v2';

const seedWorkflows: WorkflowSummary[] = [
  {
    id: 'wf-untitled',
    name: 'Untitled',
    starred: false,
    status: 'inactive',
    triggerKind: 'manual',
    triggerLabel: 'Manual Trigger',
    stepCount: 1,
    updatedAt: '2026-10-12T09:24:00+05:30',
    owner: mockUser.name,
  },
  {
    id: 'wf-content',
    name: 'AI Content Hub Automation',
    starred: true,
    status: 'active',
    triggerKind: 'schedule',
    triggerLabel: 'Schedule',
    stepCount: 6,
    updatedAt: '2026-10-11T18:02:00+05:30',
    owner: mockUser.name,
  },
  {
    id: 'wf-triage',
    name: 'Smart Ticket Triage',
    starred: false,
    status: 'active',
    triggerKind: 'webhook',
    triggerLabel: 'Webhook',
    stepCount: 5,
    updatedAt: '2026-10-10T14:47:00+05:30',
    owner: mockUser.name,
  },
  {
    id: 'wf-reports',
    name: 'Daily Executive Dashboard',
    starred: false,
    status: 'inactive',
    triggerKind: 'schedule',
    triggerLabel: 'Schedule',
    stepCount: 4,
    updatedAt: '2026-10-08T09:00:00+05:30',
    owner: mockUser.name,
  },
];

const seedExecutions: ExecutionSummary[] = [
  {
    id: 'ex-1007',
    workflowId: 'wf-triage',
    workflowName: 'Smart Ticket Triage',
    status: 'success',
    trigger: 'Webhook',
    startedAt: '2026-10-13T08:12:00+05:30',
    durationMs: 8400,
    steps: [
      { id: 's1', label: 'Extract ticket fields', status: 'success', durationMs: 1200, log: 'Parsed subject, body and priority.' },
      { id: 's2', label: 'Classify with AI', status: 'success', durationMs: 4300, log: 'category=billing, confidence=0.94' },
      { id: 's3', label: 'Send reply', status: 'success', durationMs: 2900, log: 'Reply queued via Gmail.' },
    ],
  },
  {
    id: 'ex-1006',
    workflowId: 'wf-content',
    workflowName: 'AI Content Hub Automation',
    status: 'failed',
    trigger: 'Schedule',
    startedAt: '2026-10-13T07:30:00+05:30',
    durationMs: 15200,
    error: 'SEO step: upstream API returned 429 (rate limited).',
    steps: [
      { id: 's1', label: 'Generate outline', status: 'success', durationMs: 6100, log: 'Outline ready: 5 sections.' },
      { id: 's2', label: 'Expand article', status: 'success', durationMs: 7400, log: 'Draft written (1,240 words).' },
      { id: 's3', label: 'SEO optimization', status: 'failed', durationMs: 1700, log: 'HTTP 429 from keyword API.' },
    ],
  },
  {
    id: 'ex-1005',
    workflowId: 'wf-reports',
    workflowName: 'Daily Executive Dashboard',
    status: 'success',
    trigger: 'Schedule',
    startedAt: '2026-10-12T09:00:00+05:30',
    durationMs: 47000,
    steps: [
      { id: 's1', label: 'Ingest sources', status: 'success', durationMs: 18000, log: '3 sources, 12,410 rows.' },
      { id: 's2', label: 'Clean + KPIs', status: 'success', durationMs: 21000, log: '9 KPIs computed.' },
      { id: 's3', label: 'Email report', status: 'success', durationMs: 8000, log: 'Sent to 4 stakeholders.' },
    ],
  },
  {
    id: 'ex-1004',
    workflowId: 'wf-triage',
    workflowName: 'Smart Ticket Triage',
    status: 'running',
    trigger: 'Webhook',
    startedAt: '2026-10-13T08:14:00+05:30',
    durationMs: null,
    steps: [
      { id: 's1', label: 'Extract ticket fields', status: 'success', durationMs: 1100, log: 'Parsed subject, body and priority.' },
      { id: 's2', label: 'Classify with AI', status: 'running', durationMs: null, log: 'Awaiting model response…' },
    ],
  },
];

interface MockStore {
  workflows: WorkflowSummary[];
  executions: ExecutionSummary[];
}

function loadStore(): MockStore {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MockStore;
      if (Array.isArray(parsed.workflows) && Array.isArray(parsed.executions)) return parsed;
    }
  } catch {
    // Corrupt snapshot: fall through to seeds.
  }
  return { workflows: seedWorkflows, executions: seedExecutions };
}

function saveStore(store: MockStore): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    // Storage full or unavailable: mock keeps running in memory.
  }
}

const latency = () => new Promise((r) => setTimeout(r, 120));

const newId = () => crypto.randomUUID().slice(0, 8);

export const mockClient: FlowForgeClient = {
  async listWorkflows() {
    await latency();
    return loadStore().workflows;
  },

  async getWorkflow(id) {
    await latency();
    return loadStore().workflows.find((w) => w.id === id);
  },

  async createWorkflow(name) {
    await latency();
    const store = loadStore();
    const wf: WorkflowSummary = {
      id: `wf-${newId()}`,
      name,
      starred: false,
      status: 'inactive',
      triggerKind: 'manual',
      triggerLabel: 'Manual Trigger',
      stepCount: 0,
      updatedAt: new Date().toISOString(),
      owner: mockUser.name,
    };
    store.workflows = [wf, ...store.workflows];
    saveStore(store);
    return wf;
  },

  async renameWorkflow(id, name) {
    await latency();
    const store = loadStore();
    const wf = store.workflows.find((w) => w.id === id);
    if (!wf) throw new Error('Workflow not found');
    wf.name = name;
    wf.updatedAt = new Date().toISOString();
    saveStore(store);
    return wf;
  },

  async setWorkflowStatus(id, status: WorkflowStatus) {
    await latency();
    const store = loadStore();
    const wf = store.workflows.find((w) => w.id === id);
    if (!wf) throw new Error('Workflow not found');
    wf.status = status;
    saveStore(store);
    return wf;
  },

  async duplicateWorkflow(id) {
    await latency();
    const store = loadStore();
    const src = store.workflows.find((w) => w.id === id);
    if (!src) throw new Error('Workflow not found');
    const copy: WorkflowSummary = {
      ...src,
      id: `wf-${newId()}`,
      name: `${src.name} (copy)`,
      status: 'inactive',
      starred: false,
      updatedAt: new Date().toISOString(),
    };
    store.workflows = [copy, ...store.workflows];
    saveStore(store);
    return copy;
  },

  async deleteWorkflow(id) {
    await latency();
    const store = loadStore();
    store.workflows = store.workflows.filter((w) => w.id !== id);
    saveStore(store);
  },

  async setStarred(id, starred: boolean) {
    await latency();
    const store = loadStore();
    const wf = store.workflows.find((w) => w.id === id);
    if (!wf) throw new Error('Workflow not found');
    wf.starred = starred;
    saveStore(store);
    return wf;
  },

  async listExecutions(workflowId?: string) {
    await latency();
    const { executions } = loadStore();
    return workflowId ? executions.filter((e) => e.workflowId === workflowId) : executions;
  },
};
