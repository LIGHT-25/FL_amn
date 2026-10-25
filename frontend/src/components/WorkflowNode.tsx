import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Puzzle } from 'lucide-react'
import { Fragment, memo } from 'react'
import { missingRequired, pluginMap } from '../plugins/registry'
import { chipOf, hasLogo, serviceOf } from '../plugins/services'
import { useWorkflowStore, type WorkflowNode as WorkflowNodeType } from '../store/workflowStore'
import ServiceLogo from './ServiceLogo'
import { cn } from '@/lib/utils'

/**
 * Step card — shadcn-style: flat panel, hairline border, typographic
 * header (`#01 ───── TRIGGER ●`), tinted icon tile, status carried by the
 * meta line. Plugin colour appears only in the tile and the edges; the
 * lime ring marks selection. Geometry/state rules live in reactflow.css.
 */
function WorkflowNode({ id, data, selected }: NodeProps<WorkflowNodeType>) {
  const def = pluginMap[data.pluginType]
  const Icon = def?.icon ?? Puzzle
  const color = def?.color ?? '#67675f'
  const outputs = def?.outputs ?? [{ id: 'out' }]
  const missing = def ? missingRequired(def, data.config) : []
  const isTrigger = def?.kind === 'trigger'
  const isEnd = def?.kind === 'end'
  const kind = isTrigger ? 'Trigger' : isEnd ? 'End' : def ? chipOf(def) : 'Step'
  // The step's service carries the brand domain → drives the logo tile.
  const svc = def ? serviceOf(def) : null

  // 1-based position in the canvas' node list → the "#01" step index.
  const stepIndex = useWorkflowStore((s) => {
    const nodes = s.currentId ? s.canvases[s.currentId]?.nodes : undefined
    const i = nodes ? nodes.findIndex((n) => n.id === id) : -1
    return i
  })

  const index = `#${String(Math.max(stepIndex, 0) + 1).padStart(2, '0')}`
  const configured = missing.length === 0

  return (
    <div
      className={cn(
        // `wf-node` is the styling hook React Flow's dragging rule needs.
        'wf-node relative flex w-[248px] flex-col gap-2 rounded-lg border bg-panel-2 px-3 py-2.5',
        'shadow-[0_1px_3px_rgb(0_0_0/0.45)] transition-[transform,box-shadow,border-color] duration-200',
        'hover:-translate-y-px hover:border-faint/70 hover:shadow-[0_6px_18px_rgb(0_0_0/0.55)]',
        'animate-[wf-node-in_0.22s_ease-out]',
        selected
          ? '-translate-y-0.5 border-brand ring-2 ring-brand/25 shadow-[0_14px_32px_rgb(0_0_0/0.55)]'
          : 'border-line',
      )}
    >
      {!isTrigger && <Handle type="target" position={Position.Left} className="wf-handle" />}

      {/* Header: step index, hairline rule, kind, status dot */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] leading-none font-medium tracking-[0.08em] text-faint tabular-nums">
          {index}
        </span>
        <span className="h-px min-w-3 flex-1 bg-line" />
        <span className="text-[9.5px] leading-none font-semibold tracking-[0.16em] text-muted uppercase">
          {kind}
        </span>
        <span
          className={cn(
            'size-[6px] shrink-0 rounded-full',
            configured ? 'bg-success' : 'bg-warning',
          )}
          title={configured ? 'Configured' : `Missing: ${missing.join(', ')}`}
        />
      </div>

      {/* Body: brand logo (or tinted step icon) + title + meta */}
      <div className="flex items-center gap-2.5">
        {svc && hasLogo(svc) ? (
          // Branded step → the official mark fills the tile.
          <ServiceLogo service={svc} size={36} className="rounded-md" />
        ) : (
          // Framework step (trigger, code, router…) → tinted step icon.
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md border"
            style={{
              color,
              background: `color-mix(in srgb, ${color} 14%, transparent)`,
              borderColor: `color-mix(in srgb, ${color} 32%, transparent)`,
            }}
          >
            <Icon size={19} strokeWidth={2} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13.5px] leading-tight font-semibold text-ink">
            {data.label}
          </div>
          <div
            className={cn('truncate text-[11px] leading-tight', configured ? 'text-muted' : 'text-warning')}
            title={configured ? (def ? def.label : data.pluginType) : `Missing: ${missing.join(', ')}`}
          >
            {configured ? (def ? def.label : data.pluginType) : `Missing: ${missing.join(', ')}`}
          </div>
        </div>
      </div>

      {/* Ports are absolutely positioned — a keyed Fragment (not a div)
          keeps them out of the column's flex flow, so a 4-output router
          takes the same height as a single-output step. */}
      {outputs.map((o, i) => {
        const top = `${((i + 1) / (outputs.length + 1)) * 100}%`
        return (
          <Fragment key={o.id}>
            <Handle
              type="source"
              id={o.id}
              position={Position.Right}
              className="wf-handle"
              style={{ top }}
            />
            {o.label && (
              <span className="wf-handle-label" style={{ top }}>
                {o.label}
              </span>
            )}
          </Fragment>
        )
      })}
    </div>
  )
}

export default memo(WorkflowNode)
