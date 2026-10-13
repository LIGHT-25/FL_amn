import {
  Activity,
  ArrowUpDown,
  Braces,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Download,
  History,
  Info,
  Lock,
  MoreHorizontal,
  MousePointerClick,
  Pencil,
  Plus,
  Plug,
  Reply,
  Search,
  Share2,
  Star,
  Trash2,
  User,
  UserPlus,
  Webhook,
  Workflow as WorkflowIcon,
} from 'lucide-react';
import type { Edge } from '@xyflow/react';
import { useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { ExecutionStatus, TriggerKind, WorkflowSummary } from '../api/client';
import { alertDialog, confirmDialog, promptDialog } from '../dialog/api';
import {
  useCreateWorkflow,
  useDeleteWorkflow,
  useDuplicateWorkflow,
  useExecutions,
  useRenameWorkflow,
  useSetStarred,
  useSetWorkflowStatus,
  useWorkflows,
} from '../api/query';
import type { WorkflowNode } from '../store/workflowStore';
import { useWorkflowStore } from '../store/workflowStore';
import './dashboard.css';

type TabId = 'automations' | 'runs' | 'connections' | 'variables';

const tabs: { id: TabId; label: string; icon: typeof History }[] = [
  { id: 'automations', label: 'Automations', icon: WorkflowIcon },
  { id: 'runs', label: 'Runs', icon: History },
  { id: 'connections', label: 'Connections', icon: Plug },
  { id: 'variables', label: 'Variables', icon: Braces },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${date}, ${time}`;
}

function formatDuration(ms: number | null): string {
  if (ms === null) return '—';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

// Step count comes from the real canvas bucket; untouched workflows show a dash.
function stepText(count: number | undefined): string {
  if (count === undefined) return '—';
  return `${count} step${count === 1 ? '' : 's'}`;
}

function TriggerBadge({ kind, label }: { kind: TriggerKind; label: string }) {
  const Icon = kind === 'manual' ? MousePointerClick : kind === 'webhook' ? Webhook : Clock;
  return (
    <span className="ff-trigger" title={label}>
      <Icon size={15} />
    </span>
  );
}

function StatusPill({ status, title }: { status: ExecutionStatus; title?: string }) {  const label = status === 'success' ? 'Succeeded' : status === 'failed' ? 'Failed' : status === 'running' ? 'Running' : 'Waiting';
  return (
    <span className={`ff-pill ${status}`} title={title}>
      <span className="dot" />
      {label}
    </span>
  );
}

function AutomationsPanel() {
  const navigate = useNavigate();
  const { data, isPending, isError, refetch } = useWorkflows();
  const canvases = useWorkflowStore((s) => s.canvases);
  const { seedCanvas, dropCanvas, duplicateCanvas } = useWorkflowStore.getState();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TriggerKind>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const fileRef = useRef<HTMLInputElement>(null);
  const setStatus = useSetWorkflowStatus();
  const duplicate = useDuplicateWorkflow();
  const remove = useDeleteWorkflow();
  const star = useSetStarred();
  const create = useCreateWorkflow();
  const rename = useRenameWorkflow();

  if (isPending) return <div className="ff-state">Loading automations…</div>;
  if (isError)
    return (
      <div className="ff-state">
        Could not load automations. <button className="ff-link-btn" onClick={() => refetch()}>Retry</button>
      </div>
    );

  const q = query.trim().toLowerCase();
  const filtered = data.filter(
    (w) =>
      (!q || w.name.toLowerCase().includes(q)) &&
      (typeFilter === 'all' || w.triggerKind === typeFilter) &&
      (statusFilter === 'all' || w.status === statusFilter),
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const rows = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const allChecked = rows.length > 0 && rows.every((r) => selected.includes(r.id));

  const toggleSelect = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const toggleSelectAll = () =>
    setSelected(allChecked ? selected.filter((id) => !rows.some((r) => r.id === id)) : [...selected, ...rows.map((r) => r.id).filter((id) => !selected.includes(id))]);

  const onDelete = async (id: string, name: string) => {
    setMenuId(null);
    const confirmed = await confirmDialog({
      title: 'Delete flow',
      body: `Deleting "${name}" cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (confirmed) remove.mutate(id, { onSuccess: () => dropCanvas(id) });
  };

  const onRename = async (w: WorkflowSummary) => {
    setMenuId(null);
    const name = await promptDialog({ title: 'Rename flow', initialValue: w.name, confirmLabel: 'Rename' });
    if (name !== null && name.trim() !== '' && name.trim() !== w.name) {
      rename.mutate({ id: w.id, name: name.trim() });
    }
  };

  const onExport = (w: WorkflowSummary) => {
    setMenuId(null);
    const bucket = canvases[w.id];
    const file = { name: w.name, nodes: bucket?.nodes ?? [], edges: bucket?.edges ?? [] };
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${w.name.replace(/\s+/g, '-').toLowerCase() || 'workflow'}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const onCreate = () => {
    create.mutate('Untitled', { onSuccess: (wf) => navigate(`/app/editor/${wf.id}`) });
  };

  const onImportFile = async (f: File) => {
    try {
      const parsed = JSON.parse(await f.text()) as { name?: string; nodes?: WorkflowNode[]; edges?: Edge[] };
      if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) throw new Error('Invalid workflow file');
      create.mutate(parsed.name ?? 'Imported workflow', {
        onSuccess: (wf) => {
          seedCanvas(wf.id, { nodes: parsed.nodes ?? [], edges: parsed.edges ?? [] });
          navigate(`/app/editor/${wf.id}`);
        },
      });
    } catch (err) {
      alertDialog({ title: 'Could not import', body: (err as Error).message });
    }
  };

  return (
    <>
      <div className="ff-toolbar">
        <div className="ff-search">
          <Search size={15} />
          <input placeholder="Search flows, tables and agents…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className="ff-chip" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as 'all' | TriggerKind)} title="Filter by trigger type">
          <option value="all">Type</option>
          <option value="manual">Manual</option>
          <option value="webhook">Webhook</option>
          <option value="schedule">Schedule</option>
        </select>
        <select className="ff-chip" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')} title="Filter by status">
          <option value="all">Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <span className="ff-toolbar-spacer" />
        <button className="ff-btn" onClick={() => fileRef.current?.click()} title="Import JSON">
          <Download size={15} /> Import
        </button>
        <button className="ff-btn ff-btn-primary" onClick={onCreate} disabled={create.isPending}>
          <Plus size={15} /> Create New
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onImportFile(f);
            e.target.value = '';
          }}
        />
      </div>

      {selected.length > 0 && (
        <div className="ff-selected-bar">
          <span>{selected.length} selected</span>
          <button className="ff-link-btn" onClick={() => setSelected([])}>Clear</button>
        </div>
      )}

      <div className="ff-table-wrap">
        <table className="ff-table">
          <thead>
            <tr>
              <th><input type="checkbox" checked={allChecked} onChange={toggleSelectAll} aria-label="Select all" /></th>
              <th><span className="th-inner">Name <ArrowUpDown size={12} /></span></th>
              <th><span className="th-inner"><Info size={13} /> Details</span></th>
              <th><span className="th-inner"><Clock size={13} /> Last modified</span></th>
              <th><span className="th-inner"><User size={13} /> Owner</span></th>
              <th><span className="th-inner"><Activity size={13} /> Status</span></th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((w) => (
              <tr key={w.id}>
                <td><input type="checkbox" checked={selected.includes(w.id)} onChange={() => toggleSelect(w.id)} aria-label={`Select ${w.name}`} /></td>
                <td>
                  <span className="ff-row-name">
                    <button className={`ff-star${w.starred ? ' on' : ''}`} onClick={() => star.mutate({ id: w.id, starred: !w.starred })} title={w.starred ? 'Unstar' : 'Star'}>
                      <Star size={15} fill={w.starred ? 'currentColor' : 'none'} />
                    </button>
                    <button className="ff-row-link" onClick={() => navigate(`/app/editor/${w.id}`)}>
                      <TriggerBadge kind={w.triggerKind} label={w.triggerLabel} />
                      {w.name}
                    </button>
                  </span>
                </td>
                <td><span className="ff-muted-text">{stepText(canvases[w.id]?.nodes.length)}</span></td>
                <td>{formatDate(w.updatedAt)}</td>
                <td>
                  <span className="ff-owner">
                    <span className="ff-avatar">{w.owner.charAt(0)}</span> {w.owner}
                  </span>
                </td>
                <td>
                  <button
                    className={`ff-toggle${w.status === 'active' ? ' on' : ''}`}
                    role="switch"
                    aria-checked={w.status === 'active'}
                    title={w.status === 'active' ? 'Deactivate' : 'Activate'}
                    onClick={() => setStatus.mutate({ id: w.id, status: w.status === 'active' ? 'inactive' : 'active' })}
                  />
                </td>
                <td>
                  <span className="ff-row-menu">
                    <button className="ff-head-btn-dark" onClick={() => setMenuId(menuId === w.id ? null : w.id)} title="More actions"><MoreHorizontal size={16} /></button>
                    {menuId === w.id && (
                      <>
                        <span className="ff-menu-scrim" onClick={() => setMenuId(null)} />
                        <span className="ff-menu-pop">
                          <button onClick={() => onRename(w)}>
                            <Pencil size={14} /> Rename
                          </button>
                          <button onClick={() => { setMenuId(null); duplicate.mutate(w.id, { onSuccess: (copy) => duplicateCanvas(w.id, copy.id) }); }}>
                            <Copy size={14} /> Duplicate
                          </button>
                          <button disabled title="Multiple projects arrive with the backend">
                            <Reply size={14} /> Move To
                          </button>
                          <button onClick={() => onExport(w)}>
                            <Download size={14} /> Export
                          </button>
                          <button disabled title="Sharing arrives with the backend">
                            <Share2 size={14} /> Share
                          </button>
                          <span className="ff-menu-sep" />
                          <button className="danger" onClick={() => onDelete(w.id, w.name)}>
                            <Trash2 size={14} /> Delete
                          </button>
                        </span>
                      </>
                    )}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="ff-state">No automations match the current filters.</div>}
      </div>

      <div className="ff-pagination">
        <span>Rows per page</span>
        <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
        <button className="ff-page-btn" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
          <ChevronLeft size={14} /> Previous
        </button>
        <button className="ff-page-btn" disabled={safePage >= pageCount - 1} onClick={() => setPage(safePage + 1)}>
          Next <ChevronRight size={14} />
        </button>
      </div>
    </>
  );
}

function RunsPanel() {
  const { data, isPending, isError, refetch } = useExecutions();

  if (isPending) return <div className="ff-state">Loading runs…</div>;
  if (isError)
    return (
      <div className="ff-state">
        Could not load runs. <button className="ff-link-btn" onClick={() => refetch()}>Retry</button>
      </div>
    );

  return (
    <div className="ff-table-wrap" style={{ marginTop: 16 }}>
      <table className="ff-table">
        <thead>
          <tr>
            <th><span className="th-inner"><Activity size={13} /> Status</span></th>
            <th>Automation</th>
            <th>Trigger</th>
            <th><span className="th-inner"><Clock size={13} /> Started</span></th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          {data.map((ex) => (
            <tr key={ex.id} title={ex.error ?? undefined}>
              <td><StatusPill status={ex.status} title={ex.error} /></td>
              <td>{ex.workflowName}</td>
              <td><span className="ff-muted-text">{ex.trigger}</span></td>
              <td>{formatDateTime(ex.startedAt)}</td>
              <td>{formatDuration(ex.durationMs)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && <div className="ff-state">No runs yet. Run an automation to see it here.</div>}
    </div>
  );
}

export default function ProjectDashboard() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab: TabId =
    raw === 'runs' || raw === 'connections' || raw === 'variables' ? raw : 'automations';

  return (
    <div className="ff-dash">
      <div className="ff-proj-head">
        <h1>Personal Project <Lock size={15} /></h1>
        <span className="ff-proj-spacer" />
        <button className="ff-btn" title="Team invites arrive with the auth backend">
          <UserPlus size={15} /> Add Members
        </button>
        <button className="ff-head-btn-dark" title="Project settings (coming soon)"><MoreHorizontal size={16} /></button>
      </div>

      <div className="ff-tabs">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              className={`ff-tab${tab === t.id ? ' active' : ''}`}
              onClick={() => setParams(t.id === 'automations' ? {} : { tab: t.id })}
            >
              <Icon size={16} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'automations' && <AutomationsPanel />}
      {tab === 'runs' && <RunsPanel />}
      {tab === 'connections' && (
        <div className="ff-empty">
          <Plug size={26} />
          <h2>No connections yet</h2>
          <p>App credentials (Gmail, Slack, Sheets…) plug in here once the backend lands.</p>
        </div>
      )}
      {tab === 'variables' && (
        <div className="ff-empty">
          <Braces size={26} />
          <h2>No variables yet</h2>
          <p>Shared values and secrets for your automations live here once the backend lands.</p>
        </div>
      )}
    </div>
  );
}
