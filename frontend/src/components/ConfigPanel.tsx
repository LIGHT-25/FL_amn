import { Copy, Trash2, X } from 'lucide-react'
import { pluginMap, type PluginField } from '../plugins/registry'
import { useWorkflowStore } from '../store/workflowStore'

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
    case 'json':
      return (
        <textarea
          className={field.type === 'json' && !isValidJson(value) ? 'invalid' : ''}
          rows={field.type === 'json' ? 4 : 6}
          placeholder={field.placeholder}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
        />
      )
    case 'number':
      return (
        <input
          type="number"
          placeholder={field.placeholder}
          value={(value as number | undefined) ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        />
      )
    case 'select':
      return (
        <select value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)}>
          {field.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      )
    case 'boolean':
      return (
        <label className="toggle">
          <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
          <span>{value ? 'On' : 'Off'}</span>
        </label>
      )
    default:
      return (
        <input
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
  const node = useWorkflowStore((s) => s.nodes.find((n) => n.id === s.selectedNodeId))
  const { updateNode, deleteNode, duplicateNode, selectNode } = useWorkflowStore.getState()

  if (!selectedNodeId || !node) return null
  const def = pluginMap[node.data.pluginType]
  if (!def) return null
  const Icon = def.icon

  const setConfig = (key: string, v: unknown) => updateNode(node.id, { config: { ...node.data.config, [key]: v } })

  return (
    <aside className="config-panel">
      <header>
        <span className="palette-icon" style={{ background: def.color }}>
          <Icon size={16} />
        </span>
        <div className="config-title">
          <strong>{def.label}</strong>
          <small>{def.description}</small>
        </div>
        <button className="icon-btn" onClick={() => selectNode(null)} title="Close">
          <X size={16} />
        </button>
      </header>

      <div className="config-body">
        <div className="field">
          <label>Step name</label>
          <input value={node.data.label} onChange={(e) => updateNode(node.id, { label: e.target.value })} />
        </div>

        {def.fields.length === 0 && <p className="muted">This step has no settings.</p>}

        {def.fields.map((f) => (
          <div className="field" key={f.key}>
            <label>
              {f.label}
              {f.required && <span className="req">*</span>}
            </label>
            <FieldInput field={f} value={node.data.config[f.key]} onChange={(v) => setConfig(f.key, v)} />
            {f.help && <small className="muted">{f.help}</small>}
          </div>
        ))}

        <div className="field">
          <label>Step ID</label>
          <code className="muted">{node.id}</code>
        </div>
      </div>

      <footer>
        {def.kind !== 'trigger' && (
          <button onClick={() => duplicateNode(node.id)}>
            <Copy size={14} /> Duplicate
          </button>
        )}
        <button className="danger" onClick={() => deleteNode(node.id)}>
          <Trash2 size={14} /> Delete
        </button>
      </footer>
    </aside>
  )
}
