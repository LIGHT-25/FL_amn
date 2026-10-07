import { Handle, Position, type NodeProps } from '@xyflow/react'
import { AlertCircle, Puzzle } from 'lucide-react'
import { memo, type CSSProperties } from 'react'
import { missingRequired, pluginMap } from '../plugins/registry'
import type { WorkflowNode as WorkflowNodeType } from '../store/workflowStore'

function WorkflowNode({ data, selected }: NodeProps<WorkflowNodeType>) {
  const def = pluginMap[data.pluginType]
  const Icon = def?.icon ?? Puzzle
  const color = def?.color ?? '#64748b'
  const outputs = def?.outputs ?? [{ id: 'out' }]
  const missing = def ? missingRequired(def, data.config) : []
  const isTrigger = def?.kind === 'trigger'

  return (
    <div className={`wf-node ${selected ? 'selected' : ''}`} style={{ '--accent': color } as CSSProperties}>
      {!isTrigger && <Handle type="target" position={Position.Left} className="wf-handle" />}

      <div className="wf-node-icon">
        <Icon size={20} />
      </div>
      <div className="wf-node-body">
        <div className="wf-node-title">{data.label}</div>
        <div className="wf-node-sub">{def ? def.label : data.pluginType}</div>
      </div>
      {missing.length > 0 && (
        <span className="wf-node-warn" title={`Missing: ${missing.join(', ')}`}>
          <AlertCircle size={14} />
        </span>
      )}
      {isTrigger && <span className="wf-node-badge">Trigger</span>}

      {outputs.map((o, i) => {
        const top = `${((i + 1) / (outputs.length + 1)) * 100}%`
        return (
          <div key={o.id}>
            <Handle type="source" id={o.id} position={Position.Right} className="wf-handle" style={{ top }} />
            {o.label && (
              <span className="wf-handle-label" style={{ top }}>
                {o.label}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default memo(WorkflowNode)
