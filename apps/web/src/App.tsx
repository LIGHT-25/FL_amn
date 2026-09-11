import { useEffect, useState } from "react";

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

type NodeType = {
  type: string;
  displayName: string;
  category: string;
  description: string;
};

export function App() {
  const [health, setHealth] = useState<string>("checking…");
  const [nodes, setNodes] = useState<NodeType[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const h = await fetch(`${apiUrl}/health`).then((r) => r.json());
        setHealth(h.status ?? "ok");
        const n = await fetch(`${apiUrl}/api/v1/node-types`).then((r) => r.json());
        setNodes(n.items ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "API unreachable");
        setHealth("down");
      }
    })();
  }, []);

  return (
    <main className="page">
      <header className="hero">
        <p className="brand">FlowForge</p>
        <h1>Visual workflow automation</h1>
        <p className="lede">
          Build webhook-driven integrations with a canvas editor — n8n-style, scoped for a final-year
          MVP.
        </p>
        <p className={`status status-${health}`}>API: {health}</p>
        {error ? <p className="error">Start the API (`pnpm --filter @flowforge/api dev`). {error}</p> : null}
      </header>

      <section>
        <h2>MVP node palette</h2>
        <ul className="palette">
          {nodes.map((n) => (
            <li key={n.type}>
              <strong>{n.displayName}</strong>
              <span>{n.category}</span>
              <em>{n.description}</em>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
