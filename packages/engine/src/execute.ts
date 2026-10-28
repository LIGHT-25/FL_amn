import type { FlowDefinition, FlowNode } from "@flowforge/shared";
import {
  deepInterpolate,
  getNodeDefinition,
  slugStepKey,
  type NodeExecutionResult,
  type SafeLogEntry,
} from "@flowforge/nodes";
import { topologicalSort, validateFlowStructure } from "./validation.js";

export type EngineNodeResult = {
  nodeId: string;
  nodeType: string;
  name: string;
  status: "SUCCEEDED" | "FAILED" | "SKIPPED";
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  input: unknown;
  output: unknown;
  logs: SafeLogEntry[];
  errorCode?: string;
  errorMessage?: string;
};

export type EngineRunResult = {
  status: "SUCCEEDED" | "FAILED";
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  errorCode?: string;
  errorMessage?: string;
  nodes: EngineNodeResult[];
};

export type ExecuteFlowOptions = {
  trigger?: unknown;
  env?: Record<string, string | undefined>;
  signal?: AbortSignal;
  now?: () => Date;
};

function collectInput(
  nodeId: string,
  edges: FlowDefinition["edges"],
  outputs: Map<string, unknown>,
): unknown {
  const incoming = edges.filter((e) => e.target === nodeId && outputs.has(e.source));
  if (incoming.length === 0) return undefined;
  if (incoming.length === 1) {
    return outputs.get(incoming[0]!.source);
  }
  const merged: Record<string, unknown> = {};
  for (const edge of incoming) {
    merged[edge.source] = outputs.get(edge.source);
  }
  return merged;
}

function registerStepKeys(
  steps: Record<string, unknown>,
  node: FlowNode,
  output: unknown,
): void {
  steps[node.id] = output;
  const fromConfig = node.config?.stepKey;
  if (typeof fromConfig === "string" && fromConfig.trim()) {
    steps[fromConfig.trim()] = output;
  }
  const slug = slugStepKey(node.name);
  if (slug) steps[slug] = output;
}

export async function executeFlow(
  flow: FlowDefinition,
  options: ExecuteFlowOptions = {},
): Promise<EngineRunResult> {
  const now = options.now ?? (() => new Date());
  const startedAt = now();
  const nodesById = new Map(flow.nodes.map((n) => [n.id, n]));
  const results: EngineNodeResult[] = [];
  const outputs = new Map<string, unknown>();
  const steps: Record<string, unknown> = {};

  const structureIssues = validateFlowStructure(flow);
  if (structureIssues.length) {
    const finishedAt = now();
    return {
      status: "FAILED",
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      errorCode: structureIssues[0]!.code,
      errorMessage: structureIssues.map((i) => i.message).join("; "),
      nodes: [],
    };
  }

  const order = topologicalSort(flow.nodes, flow.edges);
  if (order.length !== flow.nodes.length) {
    const finishedAt = now();
    return {
      status: "FAILED",
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      errorCode: "INVALID_GRAPH",
      errorMessage: "Could not order workflow nodes (cycle or disconnected graph)",
      nodes: [],
    };
  }

  const incomingCount = new Map<string, number>();
  for (const node of flow.nodes) incomingCount.set(node.id, 0);
  for (const edge of flow.edges) {
    if (incomingCount.has(edge.target)) {
      incomingCount.set(edge.target, (incomingCount.get(edge.target) ?? 0) + 1);
    }
  }

  const activated = new Set(
    flow.nodes.filter((n) => (incomingCount.get(n.id) ?? 0) === 0).map((n) => n.id),
  );

  for (const nodeId of order) {
    const node = nodesById.get(nodeId) as FlowNode;
    const nodeStarted = now();
    const input = collectInput(nodeId, flow.edges, outputs);

    if (!activated.has(nodeId)) {
      const finished = now();
      results.push({
        nodeId,
        nodeType: node.type,
        name: node.name,
        status: "SKIPPED",
        startedAt: nodeStarted.toISOString(),
        finishedAt: finished.toISOString(),
        durationMs: finished.getTime() - nodeStarted.getTime(),
        input,
        output: null,
        logs: [{ level: "info", message: "Skipped (branch not taken)", at: finished.toISOString() }],
      });
      continue;
    }

    if (node.disabled) {
      const finished = now();
      results.push({
        nodeId,
        nodeType: node.type,
        name: node.name,
        status: "SKIPPED",
        startedAt: nodeStarted.toISOString(),
        finishedAt: finished.toISOString(),
        durationMs: finished.getTime() - nodeStarted.getTime(),
        input,
        output: null,
        logs: [],
      });
      continue;
    }

    const definition = getNodeDefinition(node.type);
    if (!definition) {
      const finished = now();
      const message = `Node type "${node.type}" is not executable yet`;
      results.push({
        nodeId,
        nodeType: node.type,
        name: node.name,
        status: "FAILED",
        startedAt: nodeStarted.toISOString(),
        finishedAt: finished.toISOString(),
        durationMs: finished.getTime() - nodeStarted.getTime(),
        input,
        output: null,
        logs: [],
        errorCode: "NODE_NOT_IMPLEMENTED",
        errorMessage: message,
      });
      const runFinished = now();
      return {
        status: "FAILED",
        startedAt: startedAt.toISOString(),
        finishedAt: runFinished.toISOString(),
        durationMs: runFinished.getTime() - startedAt.getTime(),
        errorCode: "NODE_NOT_IMPLEMENTED",
        errorMessage: message,
        nodes: results,
      };
    }

    try {
      const interpCtx = {
        input,
        trigger: options.trigger,
        steps,
        now: nodeStarted.toISOString(),
      };
      const resolvedConfig = deepInterpolate(node.config ?? {}, interpCtx);

      const result: NodeExecutionResult = await definition.execute({
        nodeId,
        nodeType: node.type,
        config: resolvedConfig,
        input,
        trigger: options.trigger,
        steps,
        env: options.env ?? process.env,
        signal: options.signal ?? AbortSignal.timeout(120_000),
        now,
      });
      const finished = now();
      outputs.set(nodeId, result.output);
      registerStepKeys(steps, { ...node, config: resolvedConfig }, result.output);

      const outgoing = flow.edges.filter((e) => e.source === nodeId);
      for (const edge of outgoing) {
        const handle = edge.sourceHandle;
        if (result.branch && handle && handle !== result.branch) continue;
        activated.add(edge.target);
      }

      results.push({
        nodeId,
        nodeType: node.type,
        name: node.name,
        status: "SUCCEEDED",
        startedAt: nodeStarted.toISOString(),
        finishedAt: finished.toISOString(),
        durationMs: finished.getTime() - nodeStarted.getTime(),
        input,
        output: result.output,
        logs: result.logs ?? [],
      });
    } catch (err) {
      const finished = now();
      const message = err instanceof Error ? err.message : String(err);
      results.push({
        nodeId,
        nodeType: node.type,
        name: node.name,
        status: "FAILED",
        startedAt: nodeStarted.toISOString(),
        finishedAt: finished.toISOString(),
        durationMs: finished.getTime() - nodeStarted.getTime(),
        input,
        output: null,
        logs: [],
        errorCode: "NODE_FAILED",
        errorMessage: message,
      });
      const runFinished = now();
      return {
        status: "FAILED",
        startedAt: startedAt.toISOString(),
        finishedAt: runFinished.toISOString(),
        durationMs: runFinished.getTime() - startedAt.getTime(),
        errorCode: "NODE_FAILED",
        errorMessage: message,
        nodes: results,
      };
    }
  }

  const finishedAt = now();
  return {
    status: "SUCCEEDED",
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    nodes: results,
  };
}
