import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useReactFlow,
  type Connection,
  type Edge,
} from '@xyflow/react'
import { MousePointer2 } from 'lucide-react'
import { useCallback, type DragEvent } from 'react'
import { pluginMap } from '../plugins/registry'
import { useWorkflowStore, type WorkflowNode as WorkflowNodeType } from '../store/workflowStore'
import { DRAG_MIME } from './Sidebar'
import WorkflowNode from './WorkflowNode'

const nodeTypes = { workflow: WorkflowNode }

export default function Canvas() {
  const nodes = useWorkflowStore((s) => s.nodes)
  const edges = useWorkflowStore((s) => s.edges)
  const { onNodesChange, onEdgesChange, onConnect, addNode, selectNode } = useWorkflowStore.getState()
  const { screenToFlowPosition } = useReactFlow()

  const onDragOver = useCallback((e: DragEvent) => {
    if (!e.dataTransfer.types.includes(DRAG_MIME)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (e: DragEvent) => {
      const type = e.dataTransfer.getData(DRAG_MIME)
      if (!type) return
      e.preventDefault()
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY })
      // Center the node under the cursor (node is ~240x64).
      addNode(type, { x: pos.x - 120, y: pos.y - 32 })
    },
    [screenToFlowPosition, addNode],
  )

  const isValidConnection = useCallback((c: Connection | Edge) => {
    if (c.source === c.target) return false
    const target = useWorkflowStore.getState().nodes.find((n) => n.id === c.target)
    return pluginMap[target?.data.pluginType ?? '']?.kind !== 'trigger'
  }, [])

  return (
    <div className="canvas" onDragOver={onDragOver} onDrop={onDrop}>
      <ReactFlow<WorkflowNodeType>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onNodeClick={(_, n) => selectNode(n.id)}
        onPaneClick={() => selectNode(null)}
        deleteKeyCode={['Backspace', 'Delete']}
        defaultEdgeOptions={{ animated: true }}
        snapToGrid
        snapGrid={[16, 16]}
        fitView
        fitViewOptions={{ maxZoom: 1 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls />
        <MiniMap pannable zoomable nodeColor={(n) => pluginMap[(n as WorkflowNodeType).data.pluginType]?.color ?? '#94a3b8'} />
      </ReactFlow>

      {nodes.length === 0 && (
        <div className="empty-state">
          <MousePointer2 size={28} />
          <h2>Build your first workflow</h2>
          <p>Drag a trigger from the left panel onto the canvas, then add steps and connect them.</p>
        </div>
      )}
    </div>
  )
}
