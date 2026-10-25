import { Search as SearchIcon } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { useExecutions, useWorkflows } from '../api/query';

export default function Search() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const { data: workflows } = useWorkflows();
  const { data: executions } = useExecutions();

  const q = query.trim().toLowerCase();
  const flows = (workflows ?? []).filter(
    (w) => !q || w.name.toLowerCase().includes(q) || w.triggerLabel.toLowerCase().includes(q),
  );
  const runs = (executions ?? []).filter(
    (e) =>
      !q ||
      e.workflowName.toLowerCase().includes(q) ||
      e.status.includes(q) ||
      (e.error ?? '').toLowerCase().includes(q),
  );

  const firstFlow = flows[0];

  return (
    <div className="max-w-[900px] px-7 pt-6 pb-10">
      <h1 className="text-xl font-[650]">Search</h1>
      <div className="mt-4 mb-5 flex items-center gap-2.5 rounded-xl border border-line bg-panel px-4 py-[11px] text-faint">
        <SearchIcon size={17} />
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && firstFlow) navigate(`/app/editor/${firstFlow.id}`);
          }}
          placeholder="Search automations and runs…"
          aria-label="Search"
          className="h-auto flex-1 border-0 bg-transparent px-0 py-0 text-[15px] text-ink shadow-none outline-none placeholder:text-faint focus-visible:ring-0"
        />
      </div>

      {q === '' ? (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-[10px] border border-dashed border-line px-5 py-16 text-center text-muted">
          <SearchIcon size={26} />
          <h2 className="mt-1.5 text-[17px] text-ink">Search everything</h2>
          <p className="m-0 max-w-[420px] text-[13.5px]">
            Automations by name or trigger, runs by workflow, status or error. Enter opens the top match.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-[22px]">
            <h2 className="mb-2 text-xs font-semibold tracking-[0.08em] text-faint uppercase">
              Automations · {flows.length}
            </h2>
            {flows.map((w) => (
              <button
                key={w.id}
                className="flex w-full cursor-pointer items-center gap-3 rounded-[10px] border border-transparent bg-transparent px-3 py-2.5 text-left text-sm text-ink hover:border-line hover:bg-panel"
                onClick={() => navigate(`/app/editor/${w.id}`)}
              >
                {w.name}
                <span className="ml-auto whitespace-nowrap text-[12.5px] text-muted">
                  {w.status} · {w.triggerLabel}
                </span>
              </button>
            ))}
            {flows.length === 0 && <p className="text-muted">No automations match.</p>}
          </div>
          <div className="mb-[22px]">
            <h2 className="mb-2 text-xs font-semibold tracking-[0.08em] text-faint uppercase">
              Runs · {runs.length}
            </h2>
            {runs.map((e) => (
              <button
                key={e.id}
                className="flex w-full cursor-pointer items-center gap-3 rounded-[10px] border border-transparent bg-transparent px-3 py-2.5 text-left text-sm text-ink hover:border-line hover:bg-panel"
                onClick={() => navigate(`/app/debugging?run=${e.id}`)}
              >
                {e.workflowName}
                <span className="ml-auto whitespace-nowrap text-[12.5px] text-muted">{e.status}</span>
              </button>
            ))}
            {runs.length === 0 && <p className="text-muted">No runs match.</p>}
          </div>
        </>
      )}
    </div>
  );
}
