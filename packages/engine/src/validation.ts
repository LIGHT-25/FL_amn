import type { FlowDefinition, FlowEdge, FlowNode } from "@flowforge/shared";

export type ValidationIssue = {
  code: string;
  message: string;
  nodeId?: string;
  edgeId?: string;
  path?: string;
};

export function detectCycles(nodes: FlowNode[], edges: FlowEdge[]): ValidationIssue[] {
  const adjacency = new Map<string, string[]>();
  for (const node of nodes) adjacency.set(node.id, []);
  for (const edge of edges) {
    adjacency.get(edge.source)?.push(edge.target);
  }

  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map<string, number>();
  for (const node of nodes) color.set(node.id, WHITE);

  const issues: ValidationIssue[] = [];

  const visit = (id: string): void => {
    color.set(id, GRAY);
    for (const next of adjacency.get(id) ?? []) {
      const c = color.get(next) ?? WHITE;
      if (c === GRAY) {
        issues.push({
          code: "CYCLE_DETECTED",
          message: `Cycle detected involving node ${id} → ${next}`,
          nodeId: id,
        });
      } else if (c === WHITE) {
        visit(next);
      }
    }
    color.set(id, BLACK);
  };

  for (const node of nodes) {
    if (color.get(node.id) === WHITE) visit(node.id);
  }

  return issues;
}

export function validateFlowStructure(flow: FlowDefinition): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const nodeIds = new Set(flow.nodes.map((n) => n.id));

  if (new Set(flow.nodes.map((n) => n.id)).size !== flow.nodes.length) {
    issues.push({ code: "DUPLICATE_NODE_ID", message: "Node IDs must be unique" });
  }
  if (new Set(flow.edges.map((e) => e.id)).size !== flow.edges.length) {
    issues.push({ code: "DUPLICATE_EDGE_ID", message: "Edge IDs must be unique" });
  }

  for (const edge of flow.edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      issues.push({
        code: "EDGE_DANGLING",
        message: `Edge ${edge.id} references missing node`,
        edgeId: edge.id,
      });
    }
  }

  issues.push(...detectCycles(flow.nodes, flow.edges));
  return issues;
}

export function topologicalSort(nodes: FlowNode[], edges: FlowEdge[]): string[] {
  const indegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  for (const node of nodes) {
    indegree.set(node.id, 0);
    adjacency.set(node.id, []);
  }
  for (const edge of edges) {
    if (!indegree.has(edge.source) || !indegree.has(edge.target)) continue;
    adjacency.get(edge.source)!.push(edge.target);
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
  }

  const queue = [...indegree.entries()]
    .filter(([, d]) => d === 0)
    .map(([id]) => id)
    .sort();

  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const next of (adjacency.get(id) ?? []).slice().sort()) {
      const nextDeg = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, nextDeg);
      if (nextDeg === 0) queue.push(next);
      queue.sort();
    }
  }

  return order;
}
