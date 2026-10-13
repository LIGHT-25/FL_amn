import { ArrowLeft, Download, Eraser, Play, Upload } from 'lucide-react'
import { useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useRenameWorkflow, useWorkflow } from '../api/query'
import { alertDialog, confirmDialog } from '../dialog/api'
import { missingRequired, pluginMap } from '../plugins/registry'
import { useWorkflowStore, type WorkflowFile } from '../store/workflowStore'

export default function Toolbar() {
  const navigate = useNavigate()
  const { workflowId } = useParams()
  const { data: workflow } = useWorkflow(workflowId)
  const rename = useRenameWorkflow()
  const canvas = useWorkflowStore((s) => (workflowId ? s.canvases[workflowId] : undefined))
  const { load, clear } = useWorkflowStore.getState()
  const fileRef = useRef<HTMLInputElement>(null)

  const name = workflow?.name ?? 'Untitled workflow'
  const nodes = canvas?.nodes ?? []
  const edges = canvas?.edges ?? []
  const nodeCount = nodes.length

  const exportJson = () => {
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
      if (workflowId) {
        rename.mutate({ id: workflowId, name: parsed.name ?? 'Imported workflow' })
        load({ nodes: parsed.nodes, edges: parsed.edges })
      }
    } catch (err) {
      alertDialog({ title: 'Could not import', body: (err as Error).message });
    }
  }

  const validate = () => {
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
    if (problems.length) {
      alertDialog({
        title: 'Fix these before running',
        body: `• ${problems.join('\n• ')}`,
      });
    } else {
      alertDialog({
        title: 'Workflow looks valid',
        body: 'Execution comes with the backend.',
      });
    }
  }

  const onClear = async () => {
    if (!nodeCount) return;
    const confirmed = await confirmDialog({
      title: 'Remove all steps from the canvas?',
      confirmLabel: 'Clear',
      tone: 'danger',
    });
    if (confirmed) clear();
  };

  return (
    <header className="toolbar">
      <div className="brand">
        <button onClick={() => navigate('/app')} title="Back to automations">
          <ArrowLeft size={14} /> Flows
        </button>
        <input
          className="wf-name"
          value={workflow?.name ?? ''}
          onChange={(e) => workflowId && rename.mutate({ id: workflowId, name: e.target.value })}
          placeholder="Untitled workflow"
        />
      </div>
      <div className="toolbar-actions">
        <button onClick={() => fileRef.current?.click()} title="Import JSON">
          <Upload size={14} /> Import
        </button>
        <button onClick={exportJson} disabled={nodeCount === 0} title="Export JSON">
          <Download size={14} /> Export
        </button>
        <button onClick={onClear} disabled={nodeCount === 0}>
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
