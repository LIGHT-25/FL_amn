import { CheckCircle2, ChevronDown, ChevronRight, Clock, Loader2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { ExecutionStatus } from '../api/client';
import { useExecutions } from '../api/query';

function StepIcon({ status }: { status: ExecutionStatus }) {
  switch (status) {
    case 'success':
      return (
        <span className="grid shrink-0 place-items-center text-success">
          <CheckCircle2 size={17} />
        </span>
      );
    case 'failed':
      return (
        <span className="grid shrink-0 place-items-center text-danger">
          <XCircle size={17} />
        </span>
      );
    case 'running':
      return (
        <span className="grid shrink-0 place-items-center text-brand">
          <Loader2 size={17} className="animate-spin" />
        </span>
      );
    default:
      return (
        <span className="grid shrink-0 place-items-center text-faint">
          <Clock size={17} />
        </span>
      );
  }
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

export default function Debugging() {
  const [params] = useSearchParams();
  const { data, isPending } = useExecutions(5000);
  const [openSteps, setOpenSteps] = useState<string[]>([]);
  const executions = data ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const requested = params.get('run');
  const selected = executions.find((e) => e.id === selectedId) ?? executions.find((e) => e.id === requested) ?? executions[0];
  const anyRunning = executions.some((e) => e.status === 'running');

  const toggleStep = (id: string) =>
    setOpenSteps((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const status = selected?.status;
  const pillTone =
    status === 'success'
      ? 'bg-success/[0.14] text-success'
      : status === 'failed'
        ? 'bg-danger/[0.14] text-danger'
        : status === 'running'
          ? 'bg-brand/[0.14] text-brand'
          : 'bg-muted/[0.14] text-muted';

  return (
    <div className="max-w-[1000px] px-7 pt-6 pb-10">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-xl font-[650]">Debugging</h1>
          <p className="mt-1 text-[13.5px] text-muted">Live console for project runs — steps, durations and logs.</p>
        </div>
        <span className="flex-1" />
        {anyRunning && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/[0.14] px-2.5 py-[3px] text-xs font-medium text-brand">
            <span className="size-1.5 animate-pulse rounded-full bg-current [animation-duration:1.2s]" /> LIVE
          </span>
        )}
      </div>

      {isPending ? (
        <div className="px-3 py-9 text-center text-sm text-muted">Loading runs…</div>
      ) : executions.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-[10px] border border-dashed border-line px-5 py-16 text-center text-muted">
          <h2 className="mt-1.5 text-[17px] text-ink">No runs yet</h2>
          <p className="m-0 max-w-[420px] text-[13.5px]">Run an automation and its steps will appear here.</p>
        </div>
      ) : (
        selected && (
          <>
            <div className="my-4 flex items-center gap-2.5">
              <select
                value={selected.id}
                onChange={(e) => setSelectedId(e.target.value)}
                aria-label="Select run"
                className="flex-1 rounded-[9px] border border-line bg-panel px-3 py-[9px] text-[14px] text-ink outline-none focus:border-brand [&_option]:bg-panel-2"
              >
                {executions.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.workflowName} · {formatDateTime(e.startedAt)} · {e.status}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-[10px] border border-line bg-panel px-4 py-3 text-[13.5px]">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-xs font-medium',
                  pillTone,
                )}
              >
                <span
                  className={cn(
                    'size-1.5 rounded-full bg-current',
                    status === 'running' && 'animate-pulse [animation-duration:1.2s]',
                  )}
                />
                {selected.status === 'success' ? 'Succeeded' : selected.status === 'failed' ? 'Failed' : selected.status === 'running' ? 'Running' : 'Waiting'}
              </span>
              <span>{selected.workflowName}</span>
              <span className="text-muted text-[12.5px]">{selected.trigger}</span>
              <span className="text-muted text-[12.5px]">{formatDateTime(selected.startedAt)}</span>
              <span className="text-muted text-[12.5px]">{formatDuration(selected.durationMs)}</span>
            </div>

            {selected.error && (
              <div className="mt-3 rounded-[10px] border border-red-400/40 bg-red-400/[0.08] px-4 py-3 text-[13.5px] text-danger">
                {selected.error}
              </div>
            )}

            <ol className="mt-4 list-none overflow-hidden rounded-xl border border-line bg-panel p-0">
              {selected.steps.map((step, i) => {
                const open = openSteps.includes(step.id);
                return (
                  <li className="border-t border-line first:border-t-0" key={step.id}>
                    <button
                      className="flex w-full cursor-pointer items-center gap-3 border-none bg-transparent px-4 py-3 text-left text-sm text-ink hover:bg-panel-2"
                      onClick={() => toggleStep(step.id)}
                    >
                      <StepIcon status={step.status} />
                      <span className="min-w-0 flex-1 truncate">
                        {i + 1}. {step.label}
                      </span>
                      <span className="whitespace-nowrap text-[12.5px] text-muted">{formatDuration(step.durationMs)}</span>
                      {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    </button>
                    {open && (
                      <pre className="m-0 pt-3 pr-4 pb-4 pl-11 font-mono text-xs leading-[1.6] break-words whitespace-pre-wrap text-muted">
                        {step.log}
                      </pre>
                    )}
                  </li>
                );
              })}
            </ol>
          </>
        )
      )}
    </div>
  );
}
