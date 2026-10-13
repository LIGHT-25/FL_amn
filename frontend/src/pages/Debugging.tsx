import { CheckCircle2, ChevronDown, ChevronRight, Clock, Loader2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ExecutionStatus } from '../api/client';
import { useExecutions } from '../api/query';
import './debugging.css';

function StepIcon({ status }: { status: ExecutionStatus }) {
  switch (status) {
    case 'success':
      return (
        <span className="ff-step-status success">
          <CheckCircle2 size={17} />
        </span>
      );
    case 'failed':
      return (
        <span className="ff-step-status failed">
          <XCircle size={17} />
        </span>
      );
    case 'running':
      return (
        <span className="ff-step-status running">
          <Loader2 size={17} className="ff-spin" />
        </span>
      );
    default:
      return (
        <span className="ff-step-status waiting">
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

  return (
    <div className="ff-debug">
      <div className="ff-debug-head">
        <div>
          <h1>Debugging</h1>
          <p>Live console for project runs — steps, durations and logs.</p>
        </div>
        <span style={{ flex: 1 }} />
        {anyRunning && (
          <span className="ff-pill running">
            <span className="dot" /> LIVE
          </span>
        )}
      </div>

      {isPending ? (
        <div className="ff-state">Loading runs…</div>
      ) : executions.length === 0 ? (
        <div className="ff-empty">
          <h2>No runs yet</h2>
          <p>Run an automation and its steps will appear here.</p>
        </div>
      ) : (
        selected && (
          <>
            <div className="ff-run-pick">
              <select
                value={selected.id}
                onChange={(e) => setSelectedId(e.target.value)}
                aria-label="Select run"
              >
                {executions.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.workflowName} · {formatDateTime(e.startedAt)} · {e.status}
                  </option>
                ))}
              </select>
            </div>

            <div className="ff-run-meta">
              <span className={`ff-pill ${selected.status}`}>
                <span className="dot" />
                {selected.status === 'success' ? 'Succeeded' : selected.status === 'failed' ? 'Failed' : selected.status === 'running' ? 'Running' : 'Waiting'}
              </span>
              <span>{selected.workflowName}</span>
              <span className="ff-muted-text">{selected.trigger}</span>
              <span className="ff-muted-text">{formatDateTime(selected.startedAt)}</span>
              <span className="ff-muted-text">{formatDuration(selected.durationMs)}</span>
            </div>

            {selected.error && <div className="ff-run-error">{selected.error}</div>}

            <ol className="ff-steps">
              {selected.steps.map((step, i) => {
                const open = openSteps.includes(step.id);
                return (
                  <li className="ff-step" key={step.id}>
                    <button className="ff-step-head" onClick={() => toggleStep(step.id)}>
                      <StepIcon status={step.status} />
                      <span className="ff-step-name">
                        {i + 1}. {step.label}
                      </span>
                      <span className="ff-step-dur">{formatDuration(step.durationMs)}</span>
                      {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    </button>
                    {open && <pre className="ff-step-log">{step.log}</pre>}
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
