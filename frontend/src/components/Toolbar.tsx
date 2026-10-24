import { ArrowLeft, Check, Download, Eraser, Play, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useRenameWorkflow, useWorkflow } from '../api/query'
import { alertDialog, confirmDialog } from '../dialog/api'
import { missingRequired, pluginMap } from '../plugins/registry'
import { useWorkflowStore, type WorkflowFile } from '../store/workflowStore'
import { Button } from '@/components/ui/button'

/**
 * The toolbar name field is its own source of truth while the user types.
 * `draft === null` echoes the server value; once the user types, the draft
 * wins. Keyed by workflow id so switching workflows echoes the new name —
 * no sync effects, so no refetch can snap the input back mid-word.
 */
function NameField({ id, serverName, inputRef }: { id: string; serverName: string; inputRef: React.RefObject<HTMLInputElement | null> }) {
  const rename = useRenameWorkflow()
  const [draft, setDraft] = useState<string | null>(null)
  const [status, setStatus] = useState<'saving' | 'saved' | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latest = useRef({ id, serverName, draft, mutate: rename.mutate })
  const value = draft ?? serverName

  useEffect(() => {
    // Snapshot of committed/draft state so the unmount flush can decide
    // whether a final keystroke batch (composed during the debounce) is
    // still unsaved.
    latest.current = { id, serverName, draft, mutate: rename.mutate }
  }, [id, serverName, draft, rename])

  useEffect(() => {
    return () => {
      // Flush an unsaved name on unmount: real clicks blur first (committing
      // via onBlur), but keyboard navigation can unmount without any blur.
      const l = latest.current
      if (l.draft !== null && l.draft !== l.serverName) {
        if (timer.current) clearTimeout(timer.current)
        l.mutate({ id: l.id, name: l.draft })
      }
      if (resetTimer.current) clearTimeout(resetTimer.current)
    }
  }, [])

  const markSaved = () => {
    setStatus('saved')
    if (resetTimer.current) clearTimeout(resetTimer.current)
    resetTimer.current = setTimeout(() => setStatus(null), 1100)
  }

  const commit = (next: string) => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    if (next !== serverName) {
      setStatus('saving')
      rename.mutate({ id, name: next }, { onSuccess: markSaved })
    }
  }

  const saveSoon = (next: string) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      timer.current = null
      if (next !== serverName) {
        setStatus('saving')
        rename.mutate({ id, name: next }, { onSuccess: markSaved })
      }
    }, 350)
  }

  return (
    <span className="wf-name-wrap">
      <input
        ref={inputRef}
        className={status === 'saved' ? 'wf-name is-saved' : 'wf-name'}
        value={value}
        onChange={(e) => {
          setDraft(e.target.value)
          saveSoon(e.target.value)
        }}
        onBlur={() => draft !== null && commit(draft)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        }}
        placeholder="Untitled workflow"
      />
      {status !== null && (
        <span className={`wf-name-status ${status}`} aria-live="polite">
          {status === 'saved' ? <Check size={12} /> : null}
          {status === 'saved' ? 'Saved' : 'Saving\u2026'}
        </span>
      )}
    </span>
  )
}

export default function Toolbar() {
  const navigate = useNavigate()
  const { workflowId } = useParams()
  const { data: workflow } = useWorkflow(workflowId)
  const canvas = useWorkflowStore((s) => (workflowId ? s.canvases[workflowId] : undefined))
  const { load, clear } = useWorkflowStore.getState()
  const nameInputRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const name = workflow?.name ?? 'Untitled workflow'
  const rename = useRenameWorkflow()

  const nodes = canvas?.nodes ?? []
  const edges = canvas?.edges ?? []
  const nodeCount = nodes.length

  const exportJson = () => {
    // The live field value wins (blur commits before click, but the query
    // cache may lag the rename by a tick).
    const liveName = (nameInputRef.current?.value.trim() || name)
    const file: WorkflowFile = { name: liveName, nodes, edges }
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${liveName.replace(/\s+/g, '-').toLowerCase() || 'workflow'}.json`
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
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/app')}
          title="Back to automations"
          className="border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 h-8 gap-1.5"
        >
          <ArrowLeft size={14} /> Flows
        </Button>
        {workflowId ? (
          <NameField key={workflowId} id={workflowId} serverName={workflow?.name ?? ''} inputRef={nameInputRef} />
        ) : (
          <input className="wf-name" value="" placeholder="Untitled workflow" readOnly />
        )}
      </div>
      <div className="toolbar-actions">
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
          title="Import JSON"
          className="border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 h-8 gap-1.5"
        >
          <Upload size={14} /> Import
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={exportJson}
          disabled={nodeCount === 0}
          title="Export JSON"
          className="border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 h-8 gap-1.5"
        >
          <Download size={14} /> Export
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onClear}
          disabled={nodeCount === 0}
          className="border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 hover:border-red-500/40 hover:text-red-400 h-8 gap-1.5"
        >
          <Eraser size={14} /> Clear
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={validate}
          disabled={nodeCount === 0}
          className="bg-cyan-400 text-zinc-950 hover:bg-cyan-300 font-semibold shadow-sm h-8 gap-1.5"
        >
          <Play size={14} /> Test run
        </Button>
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
