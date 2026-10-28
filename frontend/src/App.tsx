import { ReactFlowProvider } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
// Must follow the library stylesheet: equal-specificity overrides win ties.
import './styles/reactflow.css'
import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { flowGraphToCanvas } from './api/flowMapper'
import { httpClient } from './api/httpClient'
import { useWorkflow } from './api/query'
import Canvas from './components/Canvas'
import ConfigPanel from './components/ConfigPanel'
import Toolbar from './components/Toolbar'
import { useWorkflowStore } from './store/workflowStore'

export default function App() {
  const { workflowId } = useParams()
  const navigate = useNavigate()
  const { openWorkflow, seedCanvas } = useWorkflowStore.getState()
  const { data: workflow, isPending } = useWorkflow(workflowId)

  useEffect(() => {
    if (!workflowId) return
    openWorkflow(workflowId)
    let cancelled = false
    void (async () => {
      const detail = await httpClient.getWorkflowDetail(workflowId)
      if (cancelled || !detail?.graph) return
      const local = useWorkflowStore.getState().canvases[workflowId]
      const serverHasNodes = detail.graph.nodes.length > 0
      const localEmpty = !local || local.nodes.length === 0
      if (serverHasNodes && localEmpty) {
        seedCanvas(workflowId, flowGraphToCanvas(detail.graph))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [workflowId, openWorkflow, seedCanvas])

  if (!isPending && workflowId && !workflow) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-muted">
          <h2 className="m-0 text-lg text-ink">Automation not found</h2>
          <p className="m-0 mb-2 text-[13px]">It may have been deleted. Pick another one from the dashboard.</p>
          <button
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-line bg-panel-2 px-3 py-1.5 text-[13px] text-ink transition-colors hover:bg-line disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => navigate('/app')}
          >
            Back to automations
          </button>
        </div>
      </div>
    )
  }

  return (
    <ReactFlowProvider>
      <div className="flex h-full min-h-0 flex-col">
        <Toolbar />
        <div className="flex min-h-0 flex-1">
          <Canvas />
          <ConfigPanel />
        </div>
      </div>
    </ReactFlowProvider>
  )
}
