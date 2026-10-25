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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

type TabId = 'automations' | 'runs' | 'connections' | 'variables';

const tabs: { id: TabId; label: string; icon: typeof History }[] = [
  { id: 'automations', label: 'Automations', icon: WorkflowIcon },
  { id: 'runs', label: 'Runs', icon: History },
  { id: 'connections', label: 'Connections', icon: Plug },
  { id: 'variables', label: 'Variables', icon: Braces },
];

/* Shared class strings (ported 1:1 from the old dashboard.css rules). */
const shell = 'max-w-[1400px] px-7 pb-10 pt-5';
const thClass = 'border-b border-line px-3 py-2.5 text-left text-[12.5px] font-medium text-muted';
const thInner = 'inline-flex items-center gap-1.5';
const tdClass = 'border-b border-line px-3 py-[11px]';
const headIconBtn =
  'grid size-8 cursor-pointer place-items-center rounded-lg border-none bg-transparent text-muted hover:bg-panel-2 hover:text-ink';
const stateClass = 'px-3 py-9 text-center text-sm text-muted';
const linkBtn = 'cursor-pointer border-none bg-transparent p-0 text-[13px] text-brand';
const chipClass =
  'h-auto w-auto cursor-pointer gap-1.5 whitespace-nowrap rounded-lg border border-dashed border-faint bg-transparent px-3 py-[7px] text-[13.5px] text-ink shadow-none hover:border-solid focus:border-solid focus:ring-1 focus:ring-lime-400 focus:border-lime-400/50 [&>svg]:hidden';
const menuItemClass =
  'gap-2.5 rounded-[7px] px-2.5 py-2 text-[13.5px] text-ink hover:bg-line focus:bg-line focus:text-ink data-[disabled]:pointer-events-auto data-[disabled]:cursor-default data-[disabled]:opacity-45 [&_svg]:h-[14px] [&_svg]:w-[14px]';
const pageBtn =
  'inline-flex cursor-pointer items-center gap-1 border-none bg-transparent px-2 py-[5px] text-[13px] text-muted hover:enabled:text-ink disabled:cursor-default disabled:opacity-40';

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
    <span
      className="inline-grid size-7 place-items-center rounded-[7px] border border-line bg-panel-2 text-muted"
      title={label}
    >
      <Icon size={15} />
    </span>
  );
}

function StatusPill({ status, title }: { status: ExecutionStatus; title?: string }) {
  const label = status === 'success' ? 'Succeeded' : status === 'failed' ? 'Failed' : status === 'running' ? 'Running' : 'Waiting';
  const tone =
    status === 'success'
      ? 'bg-success/[0.14] text-success'
      : status === 'failed'
        ? 'bg-danger/[0.14] text-danger'
        : status === 'running'
          ? 'bg-brand/[0.14] text-brand'
          : 'bg-muted/[0.14] text-muted';
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-xs font-medium', tone)} title={title}>
      <span className={cn('size-1.5 rounded-full bg-current', status === 'running' && 'animate-pulse [animation-duration:1.2s]')} />
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
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const fileRef = useRef<HTMLInputElement>(null);
  const setStatus = useSetWorkflowStatus();
  const duplicate = useDuplicateWorkflow();
  const remove = useDeleteWorkflow();
  const star = useSetStarred();
  const create = useCreateWorkflow();
  const rename = useRenameWorkflow();

  if (isPending) return <div className={stateClass}>Loading automations…</div>;
  if (isError)
    return (
      <div className={stateClass}>
        Could not load automations. <button className={linkBtn} onClick={() => refetch()}>Retry</button>
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
    const confirmed = await confirmDialog({
      title: 'Delete flow',
      body: `Deleting "${name}" cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (confirmed) remove.mutate(id, { onSuccess: () => dropCanvas(id) });
  };

  const onRename = async (w: WorkflowSummary) => {
    const name = await promptDialog({ title: 'Rename flow', initialValue: w.name, confirmLabel: 'Rename' });
    if (name !== null && name.trim() !== '' && name.trim() !== w.name) {
      rename.mutate({ id: w.id, name: name.trim() });
    }
  };

  const onExport = (w: WorkflowSummary) => {
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
      <div className="mt-4 mb-3 flex flex-wrap items-center gap-2">
        <div className="relative flex items-center min-w-[280px]">
          <Search size={15} className="absolute left-3 text-stone-500 pointer-events-none" />
          <Input
            placeholder="Search flows, tables and agents…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 h-9 bg-stone-900/80 border-stone-800 text-stone-100 placeholder:text-stone-500 focus-visible:ring-lime-400"
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as 'all' | TriggerKind)}>
          <SelectTrigger title="Filter by trigger type" className={chipClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Type</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="webhook">Webhook</SelectItem>
            <SelectItem value="schedule">Schedule</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | 'active' | 'inactive')}>
          <SelectTrigger title="Filter by status" className={chipClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <span className="flex-1" />
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
          title="Import JSON"
          className="border-stone-800 bg-stone-900/60 hover:bg-stone-800 text-stone-300 hover:text-stone-100 h-9 gap-1.5"
        >
          <Download size={15} /> Import
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={onCreate}
          disabled={create.isPending}
          className="bg-lime-400 text-stone-950 hover:bg-lime-300 font-semibold shadow-sm h-9 gap-1.5"
        >
          <Plus size={15} /> Create New
        </Button>
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
        <div className="mb-2.5 flex items-center gap-3 text-[13px] text-muted">
          <span>{selected.length} selected</span>
          <button className={linkBtn} onClick={() => setSelected([])}>Clear</button>
        </div>
      )}

      <div className="overflow-x-auto rounded-[10px] border border-line bg-panel">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className={thClass}>
                <input
                  type="checkbox"
                  className="size-[15px] cursor-pointer align-middle accent-brand"
                  checked={allChecked}
                  onChange={toggleSelectAll}
                  aria-label="Select all"
                />
              </th>
              <th className={thClass}><span className={thInner}>Name <ArrowUpDown size={12} /></span></th>
              <th className={thClass}><span className={thInner}><Info size={13} /> Details</span></th>
              <th className={thClass}><span className={thInner}><Clock size={13} /> Last modified</span></th>
              <th className={thClass}><span className={thInner}><User size={13} /> Owner</span></th>
              <th className={thClass}><span className={thInner}><Activity size={13} /> Status</span></th>
              <th className={thClass} />
            </tr>
          </thead>
          <tbody className="[&>tr:last-child>td]:border-b-0">
            {rows.map((w) => (
              <tr key={w.id} className="hover:bg-panel-2">
                <td className={tdClass}>
                  <input
                    type="checkbox"
                    className="size-[15px] cursor-pointer align-middle accent-brand"
                    checked={selected.includes(w.id)}
                    onChange={() => toggleSelect(w.id)}
                    aria-label={`Select ${w.name}`}
                  />
                </td>
                <td className={tdClass}>
                  <span className="inline-flex items-center gap-[9px]">
                    <button
                      className={cn(
                        'grid cursor-pointer place-items-center border-none bg-transparent p-0.5 text-faint hover:text-warning',
                        w.starred && 'text-warning',
                      )}
                      onClick={() => star.mutate({ id: w.id, starred: !w.starred })}
                      title={w.starred ? 'Unstar' : 'Star'}
                    >
                      <Star size={15} fill={w.starred ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      className="inline-flex cursor-pointer items-center gap-[9px] border-none bg-transparent p-0 text-sm text-ink hover:text-brand"
                      onClick={() => navigate(`/app/editor/${w.id}`)}
                    >
                      <TriggerBadge kind={w.triggerKind} label={w.triggerLabel} />
                      {w.name}
                    </button>
                  </span>
                </td>
                <td className={tdClass}><span className="text-muted">{stepText(canvases[w.id]?.nodes.length)}</span></td>
                <td className={tdClass}>{formatDate(w.updatedAt)}</td>
                <td className={tdClass}>
                  <span className="inline-flex items-center gap-2">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-teal-600 text-[13px] font-semibold text-white">
                      {w.owner.charAt(0)}
                    </span>{' '}
                    {w.owner}
                  </span>
                </td>
                <td className={tdClass}>
                  <Switch
                    checked={w.status === 'active'}
                    onCheckedChange={() =>
                      setStatus.mutate({ id: w.id, status: w.status === 'active' ? 'inactive' : 'active' })
                    }
                    title={w.status === 'active' ? 'Deactivate' : 'Activate'}
                    className="w-[34px] data-[state=unchecked]:bg-faint data-[state=checked]:translate-x-3.5 [&>span]:bg-white"
                  />
                </td>
                <td className={tdClass}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className={headIconBtn} title="More actions">
                        <MoreHorizontal size={16} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="min-w-[200px] rounded-[10px] border-line bg-panel-2 p-1.5 text-ink shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
                    >
                      <DropdownMenuItem className={menuItemClass} onSelect={() => onRename(w)}>
                        <Pencil size={14} /> Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className={menuItemClass}
                        onSelect={() =>
                          duplicate.mutate(w.id, { onSuccess: (copy) => duplicateCanvas(w.id, copy.id) })
                        }
                      >
                        <Copy size={14} /> Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem className={menuItemClass} disabled title="Multiple projects arrive with the backend">
                        <Reply size={14} /> Move To
                      </DropdownMenuItem>
                      <DropdownMenuItem className={menuItemClass} onSelect={() => onExport(w)}>
                        <Download size={14} /> Export
                      </DropdownMenuItem>
                      <DropdownMenuItem className={menuItemClass} disabled title="Sharing arrives with the backend">
                        <Share2 size={14} /> Share
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="mx-2 my-[5px] bg-line" />
                      <DropdownMenuItem
                        className={cn(menuItemClass, 'text-danger focus:text-danger')}
                        onSelect={() => onDelete(w.id, w.name)}
                      >
                        <Trash2 size={14} /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className={stateClass}>No automations match the current filters.</div>}
      </div>

      <div className="flex items-center justify-end gap-2.5 px-1 pt-3 text-[13px] text-muted">
        <span>Rows per page</span>
        <Select
          value={String(pageSize)}
          onValueChange={(v) => {
            setPageSize(Number(v));
            setPage(0);
          }}
        >
          <SelectTrigger className="h-auto w-auto cursor-pointer rounded-[7px] border border-line bg-panel px-2 py-[5px] text-[13px] text-ink shadow-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="50">50</SelectItem>
          </SelectContent>
        </Select>
        <button className={pageBtn} disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
          <ChevronLeft size={14} /> Previous
        </button>
        <button className={pageBtn} disabled={safePage >= pageCount - 1} onClick={() => setPage(safePage + 1)}>
          Next <ChevronRight size={14} />
        </button>
      </div>
    </>
  );
}

function RunsPanel() {
  const { data, isPending, isError, refetch } = useExecutions();

  if (isPending) return <div className={stateClass}>Loading runs…</div>;
  if (isError)
    return (
      <div className={stateClass}>
        Could not load runs. <button className={linkBtn} onClick={() => refetch()}>Retry</button>
      </div>
    );

  return (
    <div className="mt-4 overflow-x-auto rounded-[10px] border border-line bg-panel">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className={thClass}><span className={thInner}><Activity size={13} /> Status</span></th>
            <th className={thClass}>Automation</th>
            <th className={thClass}>Trigger</th>
            <th className={thClass}><span className={thInner}><Clock size={13} /> Started</span></th>
            <th className={thClass}>Duration</th>
          </tr>
        </thead>
        <tbody className="[&>tr:last-child>td]:border-b-0">
          {data.map((ex) => (
            <tr key={ex.id} title={ex.error ?? undefined} className="hover:bg-panel-2">
              <td className={tdClass}><StatusPill status={ex.status} title={ex.error} /></td>
              <td className={tdClass}>{ex.workflowName}</td>
              <td className={tdClass}><span className="text-muted">{ex.trigger}</span></td>
              <td className={tdClass}>{formatDateTime(ex.startedAt)}</td>
              <td className={tdClass}>{formatDuration(ex.durationMs)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && <div className={stateClass}>No runs yet. Run an automation to see it here.</div>}
    </div>
  );
}

export default function ProjectDashboard() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab: TabId =
    raw === 'runs' || raw === 'connections' || raw === 'variables' ? raw : 'automations';

  return (
    <div className={shell}>
      <div className="flex items-center gap-2.5">
        <h1 className="m-0 flex items-center gap-2 text-[17px] font-semibold">
          Personal Project <Lock size={15} className="text-muted" />
        </h1>
        <span className="flex-1" />
        <Button
          variant="outline"
          size="sm"
          title="Team invites arrive with the auth backend"
          className="border-stone-800 bg-stone-900/60 hover:bg-stone-800 text-stone-300 hover:text-stone-100 h-9 gap-1.5"
        >
          <UserPlus size={15} /> Add Members
        </Button>
        <button className={headIconBtn} title="Project settings (coming soon)">
          <MoreHorizontal size={16} />
        </button>
      </div>

      <div className="mt-3.5 flex gap-1 border-b border-line">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              className={cn(
                '-mb-px inline-flex cursor-pointer items-center gap-2 border-b-2 border-transparent bg-transparent px-3.5 py-[9px] text-sm text-muted hover:text-ink',
                tab === t.id && 'border-ink text-ink',
              )}
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
        <div className="mt-4 flex flex-col items-center gap-2 rounded-[10px] border border-dashed border-line px-5 py-16 text-center text-muted">
          <Plug size={26} />
          <h2 className="m-0 mt-1.5 text-[17px] text-ink">No connections yet</h2>
          <p className="m-0 max-w-[420px] text-[13.5px]">
            App credentials (Gmail, Slack, Sheets…) plug in here once the backend lands.
          </p>
        </div>
      )}
      {tab === 'variables' && (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-[10px] border border-dashed border-line px-5 py-16 text-center text-muted">
          <Braces size={26} />
          <h2 className="m-0 mt-1.5 text-[17px] text-ink">No variables yet</h2>
          <p className="m-0 max-w-[420px] text-[13.5px]">
            Shared values and secrets for your automations live here once the backend lands.
          </p>
        </div>
      )}
    </div>
  );
}
