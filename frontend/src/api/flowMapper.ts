import type { Edge } from '@xyflow/react'
import type { WorkflowNode } from '../store/workflowStore'
import type { FlowGraphPayload } from './httpClient'

/** Map React Flow canvas → backend FlowDefinition. */
export function canvasToFlowGraph(nodes: WorkflowNode[], edges: Edge[]): FlowGraphPayload {
  return {
    schemaVersion: 1,
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.data.pluginType,
      typeVersion: 1,
      name: n.data.label || n.data.pluginType,
      position: { x: n.position.x, y: n.position.y },
      config: n.data.config ?? {},
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      sourceHandle: e.sourceHandle ?? undefined,
      target: e.target,
      targetHandle: e.targetHandle ?? undefined,
    })),
  }
}

/** Map backend FlowDefinition → React Flow canvas snapshot. */
export function flowGraphToCanvas(graph: FlowGraphPayload): {
  nodes: WorkflowNode[]
  edges: Edge[]
} {
  return {
    nodes: graph.nodes.map((n) => ({
      id: n.id,
      type: 'workflow' as const,
      position: n.position,
      data: {
        pluginType: n.type,
        label: n.name,
        config: n.config ?? {},
      },
    })),
    edges: graph.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
      type: 'workflow',
      animated: true,
      reconnectable: true,
    })),
  }
}
