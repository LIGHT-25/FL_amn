import { Search as SearchIcon } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExecutions, useWorkflows } from '../api/query';
import './search.css';

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
    <div className="ff-search-page">
      <h1>Search</h1>
      <div className="ff-search-box">
        <SearchIcon size={17} />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && firstFlow) navigate(`/app/editor/${firstFlow.id}`);
          }}
          placeholder="Search automations and runs…"
          aria-label="Search"
        />
      </div>

      {q === '' ? (
        <div className="ff-empty">
          <SearchIcon size={26} />
          <h2>Search everything</h2>
          <p>Automations by name or trigger, runs by workflow, status or error. Enter opens the top match.</p>
        </div>
      ) : (
        <>
          <div className="ff-search-group">
            <h2>Automations · {flows.length}</h2>
            {flows.map((w) => (
              <button key={w.id} className="ff-search-hit" onClick={() => navigate(`/app/editor/${w.id}`)}>
                {w.name}
                <span className="ff-hit-sub">{w.status} · {w.triggerLabel}</span>
              </button>
            ))}
            {flows.length === 0 && <p className="ff-muted-text">No automations match.</p>}
          </div>
          <div className="ff-search-group">
            <h2>Runs · {runs.length}</h2>
            {runs.map((e) => (
              <button key={e.id} className="ff-search-hit" onClick={() => navigate(`/app/debugging?run=${e.id}`)}>
                {e.workflowName}
                <span className="ff-hit-sub">{e.status}</span>
              </button>
            ))}
            {runs.length === 0 && <p className="ff-muted-text">No runs match.</p>}
          </div>
        </>
      )}
    </div>
  );
}
