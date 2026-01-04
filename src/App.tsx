import Dashboard from './components/Dashboard'
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
    <div className="app">
      <header className="app-header">
        <h1>GitHub Activity Dashboard</h1>
        <p className="org-name">Organization: {org}</p>
      </header>
      <Dashboard org={org} />
    </div>
  )
}

export default App
