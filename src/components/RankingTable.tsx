import type { RankingItem } from '../types/api'
import './RankingTable.css'

interface RankingTableProps {
  data: RankingItem[]
  type: 'member' | 'repo'
}

function RankingTable({ data, type }: RankingTableProps) {
  if (!data || data.length === 0) {
    return <p className="no-data">データがありません</p>
  }

  return (
    <div className="ranking-table-container">
      <table className="ranking-table">
        <thead>
          <tr>
            <th>順位</th>
            <th>{type === 'member' ? 'メンバー' : 'リポジトリ'}</th>
            <th>値</th>
            <th>Commits</th>
            <th>PRs</th>
            {type === 'member' && <th>コード変更</th>}
            <th>Deploys</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item[type] || item.repo}>
              <td className="rank-cell">
                <span className={`rank-badge rank-${item.rank}`}>{item.rank}</span>
              </td>
              <td className="name-cell">
                <strong>{item[type] || item.repo}</strong>
              </td>
              <td className="value-cell">
                <span className="primary-value">{item.value?.toLocaleString()}</span>
              </td>
              <td>{item.commits?.toLocaleString() || 0}</td>
              <td>{item.prs?.toLocaleString() || 0}</td>
              {type === 'member' && (
                <td>
                  {item.additions && item.deletions
                    ? `${(item.additions + item.deletions).toLocaleString()}行`
                    : '-'}
                </td>
              )}
              <td>{item.deploys?.toLocaleString() || 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default RankingTable

