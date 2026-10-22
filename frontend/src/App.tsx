import { ReactFlowProvider } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useWorkflow } from './api/query'
import './App.css'
import Canvas from './components/Canvas'
import ConfigPanel from './components/ConfigPanel'
import Toolbar from './components/Toolbar'
import { useWorkflowStore } from './store/workflowStore'

export default function App() {
  const { workflowId } = useParams()
  const navigate = useNavigate()
  const { openWorkflow } = useWorkflowStore.getState()
  const { data: workflow, isPending } = useWorkflow(workflowId)

  useEffect(() => {
    if (workflowId) openWorkflow(workflowId)
  }, [workflowId, openWorkflow])

  if (!isPending && workflowId && !workflow) {
    return (
      <div className="app">
        <div className="app-missing">
          <h2>Automation not found</h2>
          <p>It may have been deleted. Pick another one from the dashboard.</p>
          <button onClick={() => navigate('/app')}>Back to automations</button>
        </div>
      </div>
    )
  }

  return (
    <ReactFlowProvider>
      <div className="app">
        <Toolbar />
        <div className="workspace">
          <Canvas />
          <ConfigPanel />
        </div>
      </div>
    </ReactFlowProvider>
  )
}
