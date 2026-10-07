import { ReactFlowProvider } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import './App.css'
import Canvas from './components/Canvas'
import ConfigPanel from './components/ConfigPanel'
import Sidebar from './components/Sidebar'
import Toolbar from './components/Toolbar'

export default function App() {
  return (
    <ReactFlowProvider>
      <div className="app">
        <Toolbar />
        <div className="workspace">
          <Sidebar />
          <Canvas />
          <ConfigPanel />
        </div>
      </div>
    </ReactFlowProvider>
  )
}
