import './MetricsCard.css'

interface MetricsCardProps {
  title: string
  value: string | number | undefined
  isFiltered?: boolean
}

function MetricsCard({ title, value, isFiltered = false }: MetricsCardProps) {
  return (
    <div className={`metrics-card ${isFiltered ? 'filtered' : ''}`}>
      <div className="metrics-card-header">
        <div className="metrics-card-title">{title}</div>
        {isFiltered && (
          <span className="filter-badge" title="リポジトリフィルター適用中">
            🔍
          </span>
        )}
      </div>
      <div className="metrics-card-value">{value || 0}</div>
    </div>
  )
}

export default MetricsCard

