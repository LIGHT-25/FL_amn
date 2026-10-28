import { ArrowLeft, Check, Download, Eraser, Play, Radio, Square, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { canvasToFlowGraph } from '../api/flowMapper'
import { httpClient } from '../api/httpClient'
import { useRenameWorkflow, useSetWorkflowStatus, useWorkflow } from '../api/query'
import { alertDialog, confirmDialog } from '../dialog/api'
import { missingRequired, pluginMap } from '../plugins/registry'
import { useWorkflowStore, type WorkflowFile } from '../store/workflowStore'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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
    <span className="relative inline-flex items-center">
      <input
        ref={inputRef}
        className={cn(
          'min-w-[260px] rounded-md border border-transparent bg-transparent px-2 py-1 font-semibold text-ink outline-none',
          'hover:border-faint focus:border-faint',
          status === 'saved' && 'animate-[name-flash_1.1s_ease-out]',
        )}
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
        <span
          className={cn(
            'pointer-events-none absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 whitespace-nowrap',
            'rounded-full border px-2 py-[3px] text-[11px] font-medium',
            'animate-[status-in_0.18s_ease-out]',
            status === 'saved' ? 'border-brand/25 bg-brand/10 text-brand' : 'border-line bg-panel-2 text-muted',
          )}
          aria-live="polite"
        >
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
  const [running, setRunning] = useState(false)

  const name = workflow?.name ?? 'Untitled workflow'
  const rename = useRenameWorkflow()
  const setStatus = useSetWorkflowStatus()
  const [hosting, setHosting] = useState(false)

  const nodes = canvas?.nodes ?? []
  const edges = canvas?.edges ?? []
  const nodeCount = nodes.length
  const isHosted = workflow?.status === 'active'
  const hasSchedule = nodes.some((n) => n.data.pluginType === 'trigger.schedule')
  const scheduleNode = nodes.find((n) => n.data.pluginType === 'trigger.schedule')
  const cronLabel = String(scheduleNode?.data.config?.cron ?? '0 9 * * *')
  const tzLabel = String(scheduleNode?.data.config?.timezone ?? 'UTC')

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
      alertDialog({ title: 'Could not import', body: (err as Error).message })
    }
  }

  const validateLocal = (): string[] => {
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
    return problems
  }

  const run = async () => {
    if (!workflowId) return
    const problems = validateLocal()
    if (problems.length) {
      alertDialog({
        title: 'Fix these before running',
        body: `• ${problems.join('\n• ')}`,
      })
      return
    }

    setRunning(true)
    try {
      const graph = canvasToFlowGraph(nodes, edges)
      await httpClient.saveWorkflowGraph(workflowId, graph, name)
      const execution = await httpClient.runWorkflow(workflowId)
      setRunning(false)
      if (execution.status === 'failed') {
        await alertDialog({
          title: 'Run failed',
          body: execution.error ?? 'Check the Debugging page for step logs.',
        })
      }
      navigate(`/app/debugging?run=${execution.id}`)
    } catch (err) {
      setRunning(false)
      alertDialog({
        title: 'Could not run workflow',
        body: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setRunning(false)
    }
  }

  const onClear = async () => {
    if (!nodeCount) return
    const confirmed = await confirmDialog({
      title: 'Remove all steps from the canvas?',
      confirmLabel: 'Clear',
      tone: 'danger',
    })
    if (confirmed) clear()
  }

  const toggleHost = async () => {
    if (!workflowId) return
    if (isHosted) {
      setHosting(true)
      try {
        await setStatus.mutateAsync({ id: workflowId, status: 'inactive' })
      } catch (err) {
        alertDialog({
          title: 'Could not stop hosting',
          body: err instanceof Error ? err.message : String(err),
        })
      } finally {
        setHosting(false)
      }
      return
    }

    if (!hasSchedule) {
      alertDialog({
        title: 'Add a Schedule trigger',
        body: 'Hosting keeps the automation running on a cron. Add a Schedule node first.',
      })
      return
    }

    const problems = validateLocal()
    if (problems.length) {
      alertDialog({
        title: 'Fix these before hosting',
        body: `• ${problems.join('\n• ')}`,
      })
      return
    }

    const confirmed = await confirmDialog({
      title: 'Host this automation?',
      body: `It will keep running on cron ${cronLabel} (${tzLabel}) until you stop hosting. Requires a successful Test run first.`,
      confirmLabel: 'Host',
    })
    if (!confirmed) return

    setHosting(true)
    try {
      const graph = canvasToFlowGraph(nodes, edges)
      await httpClient.saveWorkflowGraph(workflowId, graph, name)
      await setStatus.mutateAsync({ id: workflowId, status: 'active' })
    } catch (err) {
      alertDialog({
        title: 'Could not host',
        body: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setHosting(false)
    }
  }

  return (
    <header className="flex h-[52px] items-center justify-between border-b border-line bg-panel px-4">
      <div className="flex items-center gap-2.5 text-brand">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/app')}
          title="Back to automations"
          className="border-stone-800 bg-stone-900/60 hover:bg-stone-800 text-stone-300 hover:text-stone-100 h-8 gap-1.5"
        >
          <ArrowLeft size={14} /> Flows
        </Button>
        {workflowId ? (
          <NameField key={workflowId} id={workflowId} serverName={workflow?.name ?? ''} inputRef={nameInputRef} />
        ) : (
          <input
            className="min-w-[260px] rounded-md border border-transparent bg-transparent px-2 py-1 font-semibold text-ink outline-none hover:border-faint focus:border-faint"
            value=""
            placeholder="Untitled workflow"
            readOnly
          />
        )}
        {isHosted ? (
          <span className="rounded-full border border-lime-400/30 bg-lime-400/10 px-2 py-0.5 text-[11px] font-semibold text-lime-300">
            Hosted · {cronLabel}
          </span>
        ) : null}
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
          title="Import JSON"
          className="border-stone-800 bg-stone-900/60 hover:bg-stone-800 text-stone-300 hover:text-stone-100 h-8 gap-1.5"
        >
          <Upload size={14} /> Import
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={exportJson}
          disabled={nodeCount === 0}
          title="Export JSON"
          className="border-stone-800 bg-stone-900/60 hover:bg-stone-800 text-stone-300 hover:text-stone-100 h-8 gap-1.5"
        >
          <Download size={14} /> Export
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onClear}
          disabled={nodeCount === 0}
          className="border-stone-800 bg-stone-900/60 hover:bg-stone-800 text-stone-300 hover:text-stone-100 hover:border-red-500/40 hover:text-red-400 h-8 gap-1.5"
        >
          <Eraser size={14} /> Clear
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleHost}
          disabled={nodeCount === 0 || hosting || setStatus.isPending}
          title={isHosted ? 'Stop scheduled hosting' : 'Host on schedule after a green Test run'}
          className={cn(
            'h-8 gap-1.5 border-stone-800 bg-stone-900/60 text-stone-300 hover:bg-stone-800 hover:text-stone-100',
            isHosted && 'border-lime-400/40 text-lime-300 hover:border-lime-400/60',
          )}
        >
          {isHosted ? <Square size={14} /> : <Radio size={14} />}
          {hosting ? '…' : isHosted ? 'Stop host' : 'Host'}
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={run}
          disabled={nodeCount === 0 || running}
          className="bg-lime-400 text-stone-950 hover:bg-lime-300 font-semibold shadow-sm h-8 gap-1.5"
        >
          <Play size={14} /> {running ? 'Running…' : 'Test run'}
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
