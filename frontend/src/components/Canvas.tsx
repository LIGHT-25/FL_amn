import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  MiniMap,
  Panel,
  ReactFlow,
  useReactFlow,
  useStore,
  useUpdateNodeInternals,
  type Connection,
  type Edge,
} from '@xyflow/react'
import { Map as MapIcon, Maximize, MousePointer2, Plus, ZoomIn, ZoomOut } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { alertDialog } from '../dialog/api'
import { pluginMap } from '../plugins/registry'
import { useWorkflowStore, selectEdges, selectNodes, type WorkflowNode as WorkflowNodeType } from '../store/workflowStore'
import NodePicker from './NodePicker'
import WorkflowEdge from './WorkflowEdge'
import WorkflowNode from './WorkflowNode'

const nodeTypes = { workflow: WorkflowNode }
const edgeTypes = { workflow: WorkflowEdge }

/**
 * React Flow measures nodes via ResizeObserver on mount, but nodes that
 * arrive programmatically (template seeding, imports, workflow switches)
 * can miss measurement, leaving them uninitialized — and uninitialized
 * nodes render no edges. Measuring once per membership change, post-paint,
 * keeps edges alive. Uses the public updateNodeInternals API.
 */
function MeasureNodes() {
  const idsKey = useStore((s) => s.nodes.map((n) => n.id).join(','));
  const updateNodeInternals = useUpdateNodeInternals();
  useEffect(() => {
    if (idsKey === '') return;
    const raf = requestAnimationFrame(() => {
      updateNodeInternals(idsKey.split(','));
    });
    return () => cancelAnimationFrame(raf);
  }, [idsKey, updateNodeInternals]);
  return null;
}

export default function Canvas() {
  const nodes = useWorkflowStore(selectNodes)
  const edges = useWorkflowStore(selectEdges)
  const onReconnect = useWorkflowStore((s) => s.reconnectEdge)
  const { onNodesChange, onEdgesChange, onConnect, selectNode } = useWorkflowStore.getState()
  const { screenToFlowPosition, zoomIn, zoomOut, zoomTo, fitView } = useReactFlow()
  const zoom = useStore((s) => Math.round(s.transform[2] * 100))
  const [pickerOpen, setPickerOpen] = useState(false)
  const [mapOpen, setMapOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  const pickNode = (pluginType: string) => {
    const st = useWorkflowStore.getState()
    const def = pluginMap[pluginType]
    if (!def) return
    const selNode = st.currentId
      ? st.canvases[st.currentId]?.nodes.find((n) => n.id === st.selectedNodeId)
      : undefined
    if (def.kind === 'trigger') {
      const nodes = st.currentId ? (st.canvases[st.currentId]?.nodes ?? []) : []
      if (nodes.some((n) => pluginMap[n.data.pluginType]?.kind === 'trigger')) {
        setPickerOpen(false)
        alertDialog({ title: 'Only one trigger per workflow', body: 'Delete the existing trigger first.' })
        return
      }
    }
    if (def.kind === 'end') {
      const nodes = st.currentId ? (st.canvases[st.currentId]?.nodes ?? []) : []
      if (nodes.some((n) => n.data.pluginType === 'core.end')) {
        setPickerOpen(false)
        alertDialog({ title: 'Only one end node', body: 'Delete the existing End first.' })
        return
      }
    }
    let position: { x: number; y: number }
    if (selNode) {
      position = { x: selNode.position.x + 300, y: selNode.position.y }
    } else {
      const rect = wrapRef.current?.getBoundingClientRect()
      const center = rect
        ? screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
        : { x: 0, y: 0 }
      // Center the node in view (node is ~240x64).
      position = { x: center.x - 120, y: center.y - 32 }
    }
    const id = st.addNode(pluginType, position)
    if (id && selNode && def.kind !== 'trigger') {
      const outHandle = pluginMap[selNode.data.pluginType]?.outputs[0]?.id ?? 'out'
      st.onConnect({ source: selNode.id, sourceHandle: outHandle, target: id, targetHandle: null })
    }
    setPickerOpen(false)
  }

  const isValidConnection = useCallback((c: Connection | Edge) => {
    if (c.source === c.target) return false
    const s = useWorkflowStore.getState()
    const nodes = s.currentId ? (s.canvases[s.currentId]?.nodes ?? []) : []
    const target = nodes.find((n) => n.id === c.target)
    return pluginMap[target?.data.pluginType ?? '']?.kind !== 'trigger'
  }, [])

  const handleReconnect = useCallback((oldEdge: Edge, connection: Connection) => {
    onReconnect(oldEdge, connection)
  }, [onReconnect])

  return (
    <div className="canvas" ref={wrapRef}>
      <ReactFlow<WorkflowNodeType>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        colorMode="dark"
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onReconnect={handleReconnect}
        connectionLineType={ConnectionLineType.Bezier}
        connectionLineStyle={{ stroke: '#22d3ee', strokeWidth: 2.5 }}
        isValidConnection={isValidConnection}
        onNodeClick={(_, n) => selectNode(n.id)}
        onPaneClick={() => selectNode(null)}
        deleteKeyCode={['Backspace', 'Delete']}
        defaultEdgeOptions={{ animated: true, type: 'workflow', reconnectable: true }}
        snapToGrid
        snapGrid={[16, 16]}
        fitView
        fitViewOptions={{ maxZoom: 1 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={2} color="#4a4a55" />
        {mapOpen && (
          <MiniMap
            position="bottom-center"
            pannable
            zoomable
            maskColor="rgba(9, 9, 11, 0.8)"
            nodeColor={(n) => pluginMap[(n as WorkflowNodeType).data.pluginType]?.color ?? '#71717a'}
            className="canvas-minimap"
          />
        )}
        <Panel position="bottom-center" className="canvas-controls">
          <button onClick={() => zoomOut()} title="Zoom out">
            <ZoomOut size={15} />
          </button>
          <span className="canvas-controls-zoom" onClick={() => zoomTo(1)} title="Reset to 100%">
            {zoom}%
          </span>
          <button onClick={() => zoomIn()} title="Zoom in">
            <ZoomIn size={15} />
          </button>
          <i className="canvas-controls-sep" />
          <button onClick={() => fitView({ duration: 300, maxZoom: 1 })} title="Fit view">
            <Maximize size={15} />
          </button>
          <i className="canvas-controls-sep" />
          <button
            className={mapOpen ? 'is-active' : undefined}
            onClick={() => setMapOpen((o) => !o)}
            title={mapOpen ? 'Hide minimap' : 'Show minimap'}
          >
            <MapIcon size={15} />
          </button>
        </Panel>
        <MeasureNodes />
      </ReactFlow>

      <button className="canvas-add-btn" onClick={() => setPickerOpen((o) => !o)} title="Add step">
        <Plus size={20} />
      </button>
      {pickerOpen && <NodePicker onPick={pickNode} onClose={() => setPickerOpen(false)} />}

      {nodes.length === 0 && (
        <div className="empty-state">
          <MousePointer2 size={28} />
          <h2>Build your first workflow</h2>
          <p>Hit + to add a trigger, then keep adding steps. New steps connect after the selected node.</p>
        </div>
      )}
    </div>
  )
}
