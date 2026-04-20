import { NavLink } from 'react-router-dom'
import './Sidebar.css'

interface SidebarProps {
  org: string
}

function Sidebar({ org }: SidebarProps) {
  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <h2>GitHub Activity</h2>
        <p className="org-name">{org}</p>
      </div>
      <ul className="sidebar-menu">
        <li>
          <NavLink
            to="/"
            end
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            📊 ダッシュボード
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/comparison"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            📈 期間比較
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/activity"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            🕘 活動履歴
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/dora"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            🎯 DORAメトリクス
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/ai-usage"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            🤖 AI活用度
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/release-cases"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            🚀 リリース案件
          </NavLink>
        </li>
      </ul>
    </nav>
  )
}

export default Sidebar

