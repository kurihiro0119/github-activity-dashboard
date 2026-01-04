import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Dashboard from './components/Dashboard'
import Comparison from './components/Comparison'
import Sidebar from './components/Sidebar'
import './App.css'

function App() {
  const org = import.meta.env.VITE_ORG_NAME

  if (!org) {
    return (
      <div className="app">
        <div className="error-message">
          <h2>環境変数が設定されていません</h2>
          <p>VITE_ORG_NAME を設定してください</p>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <div className="app">
        <Sidebar org={org} />
        <div className="app-content">
          <Routes>
            <Route path="/" element={<Dashboard org={org} />} />
            <Route path="/comparison" element={<Comparison org={org} />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App
