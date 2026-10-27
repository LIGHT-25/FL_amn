import { Copy, Trash2, X } from 'lucide-react'
import { pluginMap, type PluginField } from '../plugins/registry'
import { hasLogo, serviceOf } from '../plugins/services'
import { useWorkflowStore } from '../store/workflowStore'
import ServiceLogo from './ServiceLogo'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

/** Step-config field controls keep the editor's own compact look (13px,
    #0d0d0b well, lime focus halo) rather than the dialog-size ui/input. */
const fieldCls =
  'w-full rounded-md border border-line bg-[#0d0d0b] px-2.5 py-[7px] text-[13px] text-ink outline-none transition-colors placeholder:text-faint focus:shadow-[0_0_0_3px_rgb(163_230_53/0.15)]'

function isValidJson(value: unknown) {
  if (typeof value !== 'string' || value.trim() === '') return true
  // Allow {{ expressions }} inside JSON by stubbing them before parsing.
  try {
    JSON.parse(value.replace(/{{[^}]*}}/g, '0'))
    return true
  } catch {
    return false
  }
}

function FieldInput({ field, value, onChange }: { field: PluginField; value: unknown; onChange: (v: unknown) => void }) {
  switch (field.type) {
    case 'textarea':
    case 'json': {
      const invalid = field.type === 'json' && !isValidJson(value)
      return (
        <textarea
          className={cn(
            fieldCls,
            'resize-y font-mono text-xs leading-[1.5]',
            invalid ? 'border-danger focus:border-danger' : 'focus:border-brand',
          )}
          rows={field.type === 'json' ? 4 : 6}
          placeholder={field.placeholder}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
        />
      )
    }
    case 'number':
      return (
        <input
          className={cn(fieldCls, 'focus:border-brand')}
          type="number"
          placeholder={field.placeholder}
          value={(value as number | undefined) ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        />
      )
    case 'select':
      return (
        <select
          className={cn(fieldCls, 'focus:border-brand [&_option]:bg-panel-2')}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
        >
          {field.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      )
    case 'boolean':
      return (
        <div className="inline-flex items-center gap-2 text-[13px] text-ink">
          <Switch checked={Boolean(value)} onCheckedChange={(v) => onChange(v)} />
          <span>{value ? 'On' : 'Off'}</span>
        </div>
      )
    default:
      return (
        <input
          className={cn(fieldCls, 'focus:border-brand')}
          type="text"
          placeholder={field.placeholder}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )
  }
}

export default function ConfigPanel() {
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId)
  const node = useWorkflowStore((s) => {
    if (!s.currentId || !s.selectedNodeId) return undefined
    return s.canvases[s.currentId]?.nodes.find((n) => n.id === s.selectedNodeId)
  })
  const { updateNode, deleteNode, duplicateNode, selectNode } = useWorkflowStore.getState()

  if (!selectedNodeId || !node) return null
  const def = pluginMap[node.data.pluginType]
  if (!def) return null
  const Icon = def.icon
  const svc = serviceOf(def)

  const setConfig = (key: string, v: unknown) => updateNode(node.id, { config: { ...node.data.config, [key]: v } })

  return (
    <aside className="flex w-[340px] flex-col border-l border-line bg-panel">
      <header className="flex items-center gap-2.5 border-b border-line p-3.5">
        {hasLogo(svc) ? (
          // Same 36px brand tile the node shows on the canvas.
          <ServiceLogo service={svc} size={36} className="rounded-md" />
        ) : (
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md"
            style={{ background: def.color }}
          >
            <Icon size={18} />
          </span>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <strong className="text-sm text-ink">{def.label}</strong>
          <small className="text-xs text-muted">{def.description}</small>
        </div>
        <button
          className="grid cursor-pointer place-items-center rounded-md border-none bg-panel-2 p-1 text-muted transition-colors hover:bg-line hover:text-ink"
          onClick={() => selectNode(null)}
          title="Close"
        >
          <X size={16} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-3.5">
        <div className="mb-3.5 flex flex-col gap-1.5">
          <Label>Step name</Label>
          <input
            className={cn(fieldCls, 'focus:border-brand')}
            value={node.data.label}
            onChange={(e) => updateNode(node.id, { label: e.target.value })}
          />
        </div>

        {def.fields.length === 0 && <p className="text-xs text-muted">This step has no settings.</p>}

        {def.fields.map((f) => (
          <div className="mb-3.5 flex flex-col gap-1.5" key={f.key}>
            <Label>
              {f.label}
              {f.required && <span className="ml-0.5 text-danger">*</span>}
            </Label>
            <FieldInput field={f} value={node.data.config[f.key]} onChange={(v) => setConfig(f.key, v)} />
            {f.help && <small className="text-xs text-muted">{f.help}</small>}
          </div>
        ))}

        <div className="mb-3.5 flex flex-col gap-1.5">
          <Label>Step ID</Label>
          <code className="break-all font-mono text-xs text-muted">{node.id}</code>
        </div>
      </div>

      <footer className="flex justify-end gap-2 border-t border-line px-3.5 py-3">
        {def.kind !== 'trigger' && (
          <Button variant="outline" size="sm" onClick={() => duplicateNode(node.id)}>
            <Copy size={14} /> Duplicate
          </Button>
        )}
        <Button variant="outline" size="sm" className="text-danger!" onClick={() => deleteNode(node.id)}>
          <Trash2 size={14} /> Delete
        </Button>
      </footer>
    </aside>
  )
}
