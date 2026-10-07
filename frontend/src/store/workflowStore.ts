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

interface WorkflowState {
  name: string
  nodes: WorkflowNode[]
  edges: Edge[]
  selectedNodeId: string | null
  setName: (name: string) => void
  onNodesChange: (changes: NodeChange<WorkflowNode>[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  addNode: (pluginType: string, position: XYPosition) => string | null
  updateNode: (id: string, patch: Partial<Pick<WorkflowNodeData, 'label' | 'config'>>) => void
  deleteNode: (id: string) => void
  duplicateNode: (id: string) => void
  selectNode: (id: string | null) => void
  load: (file: WorkflowFile) => void
  clear: () => void
}

const newId = () => crypto.randomUUID().slice(0, 8)

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set, get) => ({
      name: 'Untitled workflow',
      nodes: [],
      edges: [],
      selectedNodeId: null,

      setName: (name) => set({ name }),

      onNodesChange: (changes) => {
        const removed = changes.filter((c) => c.type === 'remove').map((c) => c.id)
        set((s) => ({
          nodes: applyNodeChanges(changes, s.nodes),
          selectedNodeId: s.selectedNodeId && removed.includes(s.selectedNodeId) ? null : s.selectedNodeId,
        }))
      },

      onEdgesChange: (changes) => set((s) => ({ edges: applyEdgeChanges(changes, s.edges) })),

      onConnect: (connection) =>
        set((s) => {
          // An output handle feeds exactly one downstream step; reconnecting replaces the old edge.
          const edges = s.edges.filter(
            (e) => !(e.source === connection.source && (e.sourceHandle ?? null) === (connection.sourceHandle ?? null)),
          )
          return { edges: addEdge({ ...connection, id: `e-${newId()}`, animated: true }, edges) }
        }),

      addNode: (pluginType, position) => {
        const def = pluginMap[pluginType]
        if (!def) return null
        if (def.kind === 'trigger' && get().nodes.some((n) => pluginMap[n.data.pluginType]?.kind === 'trigger')) {
          alert('A workflow can only have one trigger. Delete the existing trigger first.')
          return null
        }
        const id = newId()
        const node: WorkflowNode = {
          id,
          type: 'workflow',
          position,
          data: { pluginType, label: def.label, config: defaultConfig(def) },
        }
        set((s) => ({ nodes: [...s.nodes, node], selectedNodeId: id }))
        return id
      },

      updateNode: (id, patch) =>
        set((s) => ({
          nodes: s.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)),
        })),

      deleteNode: (id) =>
        set((s) => ({
          nodes: s.nodes.filter((n) => n.id !== id),
          edges: s.edges.filter((e) => e.source !== id && e.target !== id),
          selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
        })),

      duplicateNode: (id) => {
        const src = get().nodes.find((n) => n.id === id)
        if (!src || pluginMap[src.data.pluginType]?.kind === 'trigger') return
        const copy: WorkflowNode = {
          ...src,
          id: newId(),
          selected: false,
          position: { x: src.position.x + 40, y: src.position.y + 40 },
          data: { ...src.data, config: structuredClone(src.data.config) },
        }
        set((s) => ({ nodes: [...s.nodes, copy], selectedNodeId: copy.id }))
      },

      selectNode: (id) => set({ selectedNodeId: id }),

      load: (file) => set({ name: file.name, nodes: file.nodes, edges: file.edges, selectedNodeId: null }),

      clear: () => set({ nodes: [], edges: [], selectedNodeId: null }),
    }),
    {
      name: 'workflow-editor',
      partialize: (s) => ({ name: s.name, nodes: s.nodes, edges: s.edges }),
    },
  ),
)
