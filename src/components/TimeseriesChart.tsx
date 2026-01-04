import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { TimeseriesData } from '../types/api'
import './TimeseriesChart.css'

interface TimeseriesChartProps {
  data: TimeseriesData[]
}

interface ChartDataPoint {
  date: string
  commits: number
  prs: number
  deploys: number
}

function TimeseriesChart({ data }: TimeseriesChartProps) {
  if (!data || data.length === 0) {
    return <p className="no-data">データがありません</p>
  }

  const chartData: ChartDataPoint[] = data
    .map((item) => ({
      date: item.date || item.period || '',
      commits: item.commits || 0,
      prs: item.prs || 0,
      deploys: item.deploys || 0,
    }))
    .filter((item) => item.date !== '') // 日付がないデータを除外

  console.log('Chart data:', chartData)

  if (chartData.length === 0) {
    return <p className="no-data">時系列データがありません</p>
  }

  return (
    <div className="timeseries-chart">
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #ccc',
              borderRadius: '4px',
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="commits"
            stroke="#667eea"
            strokeWidth={2}
            dot={{ r: 4 }}
            name="Commits"
          />
          <Line
            type="monotone"
            dataKey="prs"
            stroke="#48bb78"
            strokeWidth={2}
            dot={{ r: 4 }}
            name="Pull Requests"
          />
          <Line
            type="monotone"
            dataKey="deploys"
            stroke="#ed8936"
            strokeWidth={2}
            dot={{ r: 4 }}
            name="Deploys"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default TimeseriesChart

