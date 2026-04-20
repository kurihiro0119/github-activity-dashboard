import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { apiClient } from '../api/client'
import type {
  AiUsageResponse,
  AiUsageGranularity,
  AiUsageScopeType,
} from '../types/api'
import RepositoryFilter from './RepositoryFilter'
import { getDefaultStartByDays, getToday, formatPeriod, formatPct } from '../utils/format'
import { useOrgRepoMembers } from '../hooks/useOrgRepoMembers'
import './AIUsage.css'

interface AIUsageProps {
  org: string
}

function AIUsage({ org }: AIUsageProps) {
  const [scopeType, setScopeType] = useState<AiUsageScopeType>('org')
  const [scopeMember, setScopeMember] = useState<string>('')
  const [startDate, setStartDate] = useState<string>(() => getDefaultStartByDays(90))
  const [endDate, setEndDate] = useState<string>(() => getToday())
  const [granularity, setGranularity] = useState<AiUsageGranularity>('month')
  const [selectedRepos, setSelectedRepos] = useState<string[]>([])

  const [appliedScopeType, setAppliedScopeType] = useState<AiUsageScopeType>('org')
  const [appliedScopeMember, setAppliedScopeMember] = useState<string>('')
  const [appliedStart, setAppliedStart] = useState<string>('')
  const [appliedEnd, setAppliedEnd] = useState<string>('')
  const [appliedGranularity, setAppliedGranularity] = useState<AiUsageGranularity>('month')
  const [appliedRepos, setAppliedRepos] = useState<string[]>([])

  const { repos: allRepos, members: allMembers } = useOrgRepoMembers(org, 180)
  const [data, setData] = useState<AiUsageResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (appliedScopeType === 'member' && !appliedScopeMember) return
    setLoading(true)
    setError(null)
    try {
      const params = {
        start: appliedStart,
        end: appliedEnd,
        granularity: appliedGranularity,
        ...(appliedRepos.length > 0 ? { repo: appliedRepos } : {}),
      }
      const res =
        appliedScopeType === 'member'
          ? await apiClient.getMemberAIUsage(org, appliedScopeMember, params)
          : await apiClient.getOrgAIUsage(org, params)
      setData(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [
    org,
    appliedScopeType,
    appliedScopeMember,
    appliedStart,
    appliedEnd,
    appliedGranularity,
    appliedRepos,
  ])

  useEffect(() => {
    if (!appliedStart || !appliedEnd) return
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    appliedScopeType,
    appliedScopeMember,
    appliedStart,
    appliedEnd,
    appliedGranularity,
    appliedRepos,
  ])

  const hasPendingChanges =
    scopeType !== appliedScopeType ||
    scopeMember !== appliedScopeMember ||
    startDate !== appliedStart ||
    endDate !== appliedEnd ||
    granularity !== appliedGranularity ||
    selectedRepos.length !== appliedRepos.length ||
    selectedRepos.some((r) => !appliedRepos.includes(r))

  const applyFilters = () => {
    setAppliedScopeType(scopeType)
    setAppliedScopeMember(scopeMember)
    setAppliedStart(startDate)
    setAppliedEnd(endDate)
    setAppliedGranularity(granularity)
    setAppliedRepos([...selectedRepos])
  }

  const canApply = scopeType === 'org' || (scopeType === 'member' && !!scopeMember)

  const tsChartData = useMemo(
    () =>
      data?.timeseries.map((p) => ({
        period: formatPeriod(p.period, appliedGranularity),
        total: p.total,
        ai: p.ai,
        rate: p.rate * 100,
      })) ?? [],
    [data, appliedGranularity]
  )

  const typeChartData = useMemo(
    () =>
      data?.by_type
        .slice()
        .sort((a, b) => b.count - a.count)
        .slice(0, 15) ?? [],
    [data]
  )

  return (
    <div className="ai-usage">
      <div className="ai-header">
        <h1>AI活用度</h1>
      </div>

      <div className="ai-notice">
        <strong>判定ロジック:</strong> commit メッセージが
        <code>feat_AI(...)</code> / <code>fix_AI:...</code> /{' '}
        <code>feat(service_AI):...</code> / <code>feat-ai(...)</code>{' '}
        のいずれかのパターンに合致する commit を「AI commit」として集計。
      </div>

      <div className="ai-filters">
        <div className="filter-row">
          <span className="filter-label">スコープ:</span>
          {(['org', 'member'] as AiUsageScopeType[]).map((t) => (
            <label key={t} className="scope-radio">
              <input
                type="radio"
                name="scope"
                checked={scopeType === t}
                onChange={() => setScopeType(t)}
              />
              {t === 'org' ? '組織全体' : 'メンバー'}
            </label>
          ))}
        </div>

        {scopeType === 'member' && (
          <div className="filter-row">
            <label>
              メンバー:
              <select value={scopeMember} onChange={(e) => setScopeMember(e.target.value)}>
                <option value="">-- 選択してください --</option>
                {allMembers.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        <div className="filter-row">
          <label>
            開始日:
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>
          <label>
            終了日:
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </label>
          <label>
            粒度:
            <select
              value={granularity}
              onChange={(e) => setGranularity(e.target.value as AiUsageGranularity)}
            >
              <option value="day">日次</option>
              <option value="week">週次</option>
              <option value="month">月次</option>
            </select>
          </label>
        </div>

        <div className="filter-row">
          <RepositoryFilter
            repositories={allRepos}
            selectedRepos={selectedRepos}
            onChange={setSelectedRepos}
          />
        </div>

        <div className="filter-row">
          <button
            className="apply-btn"
            onClick={applyFilters}
            disabled={!canApply || loading || (!hasPendingChanges && data !== null)}
          >
            {loading ? '読み込み中...' : '表示'}
          </button>
          {hasPendingChanges && canApply && (
            <span className="pending-hint">未適用の変更があります</span>
          )}
        </div>
      </div>

      {error && <div className="ai-error">エラー: {error}</div>}

      {data && !loading && (
        <>
          <div className="ai-scope-info">
            <span className="scope-chip">
              {data.scope.type === 'org' ? '組織全体' : `メンバー: ${data.scope.member}`}
            </span>
            <span className="range-chip">
              {new Date(data.time_range.start).toLocaleDateString()} 〜{' '}
              {new Date(data.time_range.end).toLocaleDateString()}
            </span>
          </div>

          <div className="ai-summary-cards">
            <div className="summary-card">
              <div className="summary-label">全 commit 数</div>
              <div className="summary-value">{data.summary.total_commits.toLocaleString()}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">AI commit 数</div>
              <div className="summary-value ai-color">
                {data.summary.ai_commits.toLocaleString()}
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-label">AI 活用率</div>
              <div className="summary-value ai-color">{formatPct(data.summary.ai_rate)}</div>
            </div>
          </div>

          <div className="chart-block">
            <h2>AI 活用推移</h2>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={tsChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis yAxisId="left" />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  unit="%"
                  domain={[0, 100]}
                />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="total"
                  stroke="#999"
                  name="全 commit"
                  strokeWidth={1.5}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="ai"
                  stroke="#6f42c1"
                  name="AI commit"
                  strokeWidth={2}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="rate"
                  stroke="#ff9800"
                  name="AI率 (%)"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="ai-two-col">
            <div className="chart-block">
              <h2>type 別 AI commit 件数</h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={typeChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="type" type="category" width={90} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6f42c1" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-block">
              <h2>normal vs AI (平均)</h2>
              <table className="stats-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>normal</th>
                    <th>AI</th>
                    <th>差分</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>commits</td>
                    <td>{data.stats.normal.commits.toLocaleString()}</td>
                    <td>{data.stats.ai.commits.toLocaleString()}</td>
                    <td>-</td>
                  </tr>
                  <tr>
                    <td>avg additions</td>
                    <td>{data.stats.normal.avg_additions.toFixed(1)}</td>
                    <td className="ai-color">{data.stats.ai.avg_additions.toFixed(1)}</td>
                    <td>
                      {(data.stats.ai.avg_additions - data.stats.normal.avg_additions).toFixed(1)}
                    </td>
                  </tr>
                  <tr>
                    <td>avg deletions</td>
                    <td>{data.stats.normal.avg_deletions.toFixed(1)}</td>
                    <td className="ai-color">{data.stats.ai.avg_deletions.toFixed(1)}</td>
                    <td>
                      {(data.stats.ai.avg_deletions - data.stats.normal.avg_deletions).toFixed(1)}
                    </td>
                  </tr>
                  <tr>
                    <td>avg files changed</td>
                    <td>{data.stats.normal.avg_files_changed.toFixed(2)}</td>
                    <td className="ai-color">{data.stats.ai.avg_files_changed.toFixed(2)}</td>
                    <td>
                      {(
                        data.stats.ai.avg_files_changed - data.stats.normal.avg_files_changed
                      ).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {data.by_member && data.by_member.length > 0 && (
            <div className="chart-block">
              <h2>メンバー別 AI 活用度</h2>
              <table className="ranking-table">
                <thead>
                  <tr>
                    <th>メンバー</th>
                    <th>total</th>
                    <th>AI</th>
                    <th>AI率</th>
                    <th>ゲージ</th>
                  </tr>
                </thead>
                <tbody>
                  {data.by_member.map((m) => (
                    <tr key={m.member}>
                      <td>{m.member}</td>
                      <td>{m.total.toLocaleString()}</td>
                      <td className="ai-color">{m.ai.toLocaleString()}</td>
                      <td>{formatPct(m.rate)}</td>
                      <td className="gauge-cell">
                        <div className="gauge-bar">
                          <div
                            className="gauge-fill"
                            style={{ width: `${Math.min(m.rate * 100, 100)}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="chart-block">
            <h2>ブランチ別 AI 活用度</h2>
            <table className="ranking-table">
              <thead>
                <tr>
                  <th>ブランチ</th>
                  <th>total</th>
                  <th>AI</th>
                  <th>AI率</th>
                  <th>ゲージ</th>
                </tr>
              </thead>
              <tbody>
                {data.by_branch.slice(0, 20).map((b) => (
                  <tr key={b.branch}>
                    <td className="branch-cell">
                      {b.branch === '(none)' ? (
                        <span className="branch-none">(none)</span>
                      ) : (
                        <span className="branch-name">🌿 {b.branch}</span>
                      )}
                    </td>
                    <td>{b.total.toLocaleString()}</td>
                    <td className="ai-color">{b.ai.toLocaleString()}</td>
                    <td>{formatPct(b.rate)}</td>
                    <td className="gauge-cell">
                      <div className="gauge-bar">
                        <div
                          className="gauge-fill"
                          style={{ width: `${Math.min(b.rate * 100, 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {data === null && !loading && !error && (
        <div className="ai-empty">「表示」ボタンを押してAI活用度を取得してください</div>
      )}
    </div>
  )
}

export default AIUsage
