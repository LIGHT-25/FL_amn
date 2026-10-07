import { Download, Eraser, Play, Upload, Workflow } from 'lucide-react'
import { useRef } from 'react'
import { missingRequired, pluginMap } from '../plugins/registry'
import { useWorkflowStore, type WorkflowFile } from '../store/workflowStore'

export default function Toolbar() {
  const name = useWorkflowStore((s) => s.name)
  const nodeCount = useWorkflowStore((s) => s.nodes.length)
  const { setName, load, clear } = useWorkflowStore.getState()
  const fileRef = useRef<HTMLInputElement>(null)

  const exportJson = () => {
    const { name, nodes, edges } = useWorkflowStore.getState()
    const file: WorkflowFile = { name, nodes, edges }
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${name.replace(/\s+/g, '-').toLowerCase() || 'workflow'}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const importJson = async (f: File) => {
    try {
      const parsed = JSON.parse(await f.text()) as WorkflowFile
      if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) throw new Error('Invalid workflow file')
      load({ name: parsed.name ?? 'Imported workflow', nodes: parsed.nodes, edges: parsed.edges })
    } catch (err) {
      alert(`Could not import: ${(err as Error).message}`)
    }
  }

  const validate = () => {
    const { nodes, edges } = useWorkflowStore.getState()
    const problems: string[] = []
    const trigger = nodes.find((n) => pluginMap[n.data.pluginType]?.kind === 'trigger')
    if (!trigger) problems.push('Add a trigger to start the workflow.')
    for (const n of nodes) {
      const def = pluginMap[n.data.pluginType]
      if (!def) continue
      const missing = missingRequired(def, n.data.config)
      if (missing.length) problems.push(`"${n.data.label}" is missing: ${missing.join(', ')}`)
      if (def.kind !== 'trigger' && !edges.some((e) => e.target === n.id)) {
        problems.push(`"${n.data.label}" is not connected to anything.`)
      }
    }
    alert(problems.length ? `Fix these before running:\n\n• ${problems.join('\n• ')}` : 'Workflow looks valid. (Execution comes with the backend.)')
  }

  return (
    <header className="toolbar">
      <div className="brand">
        <Workflow size={20} />
        <input className="wf-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="toolbar-actions">
        <button onClick={() => fileRef.current?.click()} title="Import JSON">
          <Upload size={14} /> Import
        </button>
        <button onClick={exportJson} disabled={nodeCount === 0} title="Export JSON">
          <Download size={14} /> Export
        </button>
        <button
          onClick={() => nodeCount && confirm('Remove all steps from the canvas?') && clear()}
          disabled={nodeCount === 0}
        >
          <Eraser size={14} /> Clear
        </button>
        <button className="primary" onClick={validate} disabled={nodeCount === 0}>
          <Play size={14} /> Test run
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) importJson(f)
            e.target.value = ''
          }}
        />
      </div>
    </header>
  )
}
