import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type XYPosition,
} from '@xyflow/react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { defaultConfig, pluginMap } from '../plugins/registry'

export type WorkflowNodeData = {
  pluginType: string
  label: string
  config: Record<string, unknown>
}

export type WorkflowNode = Node<WorkflowNodeData, 'workflow'>

export interface WorkflowFile {
  name: string
  nodes: WorkflowNode[]
  edges: Edge[]
}

export interface CanvasSnapshot {
  nodes: WorkflowNode[]
  edges: Edge[]
}

const emptyCanvas = (): CanvasSnapshot => ({ nodes: [], edges: [] })

// Stable empty refs: selectors must return cached values, never fresh
// literals, or concurrent renders can commit torn UI (nodes without edges).
const EMPTY_NODES: WorkflowNode[] = []
const EMPTY_EDGES: Edge[] = []

export const selectNodes = (s: WorkflowState): WorkflowNode[] =>
  s.currentId ? (s.canvases[s.currentId]?.nodes ?? EMPTY_NODES) : EMPTY_NODES

export const selectEdges = (s: WorkflowState): Edge[] =>
  s.currentId ? (s.canvases[s.currentId]?.edges ?? EMPTY_EDGES) : EMPTY_EDGES

interface WorkflowState {
  currentId: string | null
  canvases: Record<string, CanvasSnapshot>
  selectedNodeId: string | null
  openWorkflow: (id: string) => void
  seedCanvas: (id: string, snapshot: CanvasSnapshot) => void
  dropCanvas: (id: string) => void
  duplicateCanvas: (srcId: string, destId: string) => void
  onNodesChange: (changes: NodeChange<WorkflowNode>[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  reconnectEdge: (oldEdge: Edge, connection: Connection) => void
  addNode: (pluginType: string, position: XYPosition) => string | null
  updateNode: (id: string, patch: Partial<Pick<WorkflowNodeData, 'label' | 'config'>>) => void
  deleteNode: (id: string) => void
  duplicateNode: (id: string) => void
  selectNode: (id: string | null) => void
  load: (snapshot: CanvasSnapshot) => void
  clear: () => void
}

const newId = () => crypto.randomUUID().slice(0, 8)

function currentNodes(get: () => WorkflowState): WorkflowNode[] {
  const { currentId, canvases } = get()
  return currentId ? (canvases[currentId]?.nodes ?? []) : []
}

function withCanvas(
  set: (fn: (s: WorkflowState) => Partial<WorkflowState>) => void,
  get: () => WorkflowState,
  fn: (canvas: CanvasSnapshot) => CanvasSnapshot,
): void {
  const { currentId, canvases } = get()
  if (!currentId) return
  const next = fn(canvases[currentId] ?? emptyCanvas())
  set(() => ({ canvases: { ...canvases, [currentId]: next } }))
}

function withNodes(
  set: (fn: (s: WorkflowState) => Partial<WorkflowState>) => void,
  get: () => WorkflowState,
  fn: (nodes: WorkflowNode[]) => WorkflowNode[],
): void {
  withCanvas(set, get, (c) => ({ ...c, nodes: fn(c.nodes) }))
}

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set, get) => ({
      currentId: null,
      canvases: {},
      selectedNodeId: null,

      openWorkflow: (id) =>
        set((s) => ({
          currentId: id,
          canvases: s.canvases[id] ? s.canvases : { ...s.canvases, [id]: emptyCanvas() },
          selectedNodeId: null,
        })),

      seedCanvas: (id, snapshot) =>
        set((s) => ({ canvases: { ...s.canvases, [id]: snapshot } })),

      dropCanvas: (id) =>
        set((s) => {
          const canvases = { ...s.canvases }
          delete canvases[id]
          return { canvases, currentId: s.currentId === id ? null : s.currentId };
        }),

      duplicateCanvas: (srcId, destId) =>
        set((s) => {
          const src = s.canvases[srcId]
          if (!src) return {}
          return { canvases: { ...s.canvases, [destId]: structuredClone(src) } };
        }),

      onNodesChange: (changes) => {
        const removed = changes.filter((c) => c.type === 'remove').map((c) => c.id)
        withNodes(set, get, (nodes) => applyNodeChanges(changes, nodes))
        if (removed.length) {
          const { selectedNodeId } = get()
          if (selectedNodeId && removed.includes(selectedNodeId)) set({ selectedNodeId: null })
        }
      },

      onEdgesChange: (changes) =>
        withCanvas(set, get, (c) => ({ ...c, edges: applyEdgeChanges(changes, c.edges) })),

      onConnect: (connection) =>
        withCanvas(set, get, (c) => {
          // An output handle feeds exactly one downstream step; reconnecting replaces the old edge.
          const edges = c.edges.filter(
            (e) => !(e.source === connection.source && (e.sourceHandle ?? null) === (connection.sourceHandle ?? null)),
          )
          const colorOf = (id: string | null | undefined) =>
            pluginMap[c.nodes.find((n) => n.id === id)?.data.pluginType ?? '']?.color ?? '#71717a'
          return {
            ...c,
            edges: addEdge(
              {
                ...connection,
                id: `e-${newId()}`,
                animated: true,
                reconnectable: true,
                data: {
                  sourceColor: colorOf(connection.source),
                  targetColor: colorOf(connection.target),
                },
              },
              edges,
            ),
          };
        }),

      reconnectEdge: (oldEdge, connection) =>
        withCanvas(set, get, (c) => {
          const source = connection.source ?? oldEdge.source
          const target = connection.target ?? oldEdge.target
          const colorOf = (id: string) =>
            pluginMap[c.nodes.find((n) => n.id === id)?.data.pluginType ?? '']?.color ?? '#71717a'
          // Keep the single-output rule: drop other edges from the same handle.
          const edges = c.edges.filter(
            (e) =>
              e.id === oldEdge.id ||
              !(e.source === source && (e.sourceHandle ?? null) === (connection.sourceHandle ?? null)),
          )
          return {
            ...c,
            edges: edges.map((e) =>
              e.id === oldEdge.id
                ? {
                    ...e,
                    source,
                    target,
                    sourceHandle: connection.sourceHandle ?? undefined,
                    targetHandle: connection.targetHandle ?? undefined,
                    data: { sourceColor: colorOf(source), targetColor: colorOf(target) },
                  }
                : e,
            ),
          };
        }),

      addNode: (pluginType, position) => {
        const def = pluginMap[pluginType]
        if (!def) return null
        const nodes = currentNodes(get)
        if (def.kind === 'trigger' && nodes.some((n) => pluginMap[n.data.pluginType]?.kind === 'trigger')) {
          return null
        }
        const id = newId()
        const node: WorkflowNode = {
          id,
          type: 'workflow',
          position,
          data: { pluginType, label: def.label, config: defaultConfig(def) },
        }
        withNodes(set, get, (ns) => [...ns, node])
        set({ selectedNodeId: id })
        return id
      },

      updateNode: (id, patch) =>
        withNodes(set, get, (nodes) =>
          nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)),
        ),

      deleteNode: (id) =>
        withCanvas(set, get, (c) => ({
          nodes: c.nodes.filter((n) => n.id !== id),
          edges: c.edges.filter((e) => e.source !== id && e.target !== id),
        })),

      duplicateNode: (id) => {
        const src = currentNodes(get).find((n) => n.id === id)
        if (!src || pluginMap[src.data.pluginType]?.kind === 'trigger') return
        const copy: WorkflowNode = {
          ...src,
          id: newId(),
          selected: false,
          position: { x: src.position.x + 40, y: src.position.y + 40 },
          data: { ...src.data, config: structuredClone(src.data.config) },
        }
        withNodes(set, get, (ns) => [...ns, copy])
        set({ selectedNodeId: copy.id })
      },

      selectNode: (id) => set({ selectedNodeId: id }),

      load: (snapshot) =>
        withCanvas(set, get, (c) => ({
          ...c,
          nodes: snapshot.nodes,
          edges: snapshot.edges,
        })),

      clear: () => withCanvas(set, get, (c) => ({ ...c, nodes: [], edges: [] })),
    }),
    {
      name: 'flowforge-canvases-v1',
      partialize: (s) => ({ canvases: s.canvases }),
    },
  ),
)
