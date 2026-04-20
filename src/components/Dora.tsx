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
  ResponsiveContainer,
} from 'recharts'
import { apiClient } from '../api/client'
import type {
  DoraResponse,
  DoraGranularity,
  DoraScopeType,
  DoraBenchmark,
} from '../types/api'
import RepositoryFilter from './RepositoryFilter'
import { getDefaultStartByDays, getToday, formatHours, formatPeriod } from '../utils/format'
import { useOrgRepoMembers } from '../hooks/useOrgRepoMembers'
import './Dora.css'

interface DoraProps {
  org: string
}

const benchmarkLabel: Record<DoraBenchmark, string> = {
  elite: 'Elite',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  insufficient_data: 'データ不足',
}

const formatPercent = (v: number | null): string =>
  v === null || v === undefined ? '-' : `${v.toFixed(2)}%`

function Dora({ org }: DoraProps) {
  const [scopeType, setScopeType] = useState<DoraScopeType>('org')
  const [scopeRepo, setScopeRepo] = useState<string>('')
  const [scopeMember, setScopeMember] = useState<string>('')
  const [startDate, setStartDate] = useState<string>(() => getDefaultStartByDays(90))
  const [endDate, setEndDate] = useState<string>(() => getToday())
  const [granularity, setGranularity] = useState<DoraGranularity>('week')
  const [environment, setEnvironment] = useState<string>('production')
  const [selectedRepos, setSelectedRepos] = useState<string[]>([])

  const [appliedScopeType, setAppliedScopeType] = useState<DoraScopeType>('org')
  const [appliedScopeRepo, setAppliedScopeRepo] = useState<string>('')
  const [appliedScopeMember, setAppliedScopeMember] = useState<string>('')
  const [appliedStart, setAppliedStart] = useState<string>('')
  const [appliedEnd, setAppliedEnd] = useState<string>('')
  const [appliedGranularity, setAppliedGranularity] = useState<DoraGranularity>('week')
  const [appliedEnvironment, setAppliedEnvironment] = useState<string>('production')
  const [appliedRepos, setAppliedRepos] = useState<string[]>([])

  const { repos: allRepos, members: allMembers } = useOrgRepoMembers(org, 90)
  const [dora, setDora] = useState<DoraResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDora = useCallback(async () => {
    if (appliedScopeType === 'repo' && !appliedScopeRepo) return
    if (appliedScopeType === 'member' && !appliedScopeMember) return
    setLoading(true)
    setError(null)
    try {
      const params = {
        start: appliedStart,
        end: appliedEnd,
        granularity: appliedGranularity,
        environment: appliedEnvironment,
        ...(appliedRepos.length > 0 && appliedScopeType !== 'repo'
          ? { repo: appliedRepos }
          : {}),
      }
      let res: DoraResponse
      if (appliedScopeType === 'repo') {
        res = await apiClient.getRepoDora(org, appliedScopeRepo, params)
      } else if (appliedScopeType === 'member') {
        res = await apiClient.getMemberDora(org, appliedScopeMember, params)
      } else {
        res = await apiClient.getOrgDora(org, params)
      }
      setDora(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [
    org,
    appliedScopeType,
    appliedScopeRepo,
    appliedScopeMember,
    appliedStart,
    appliedEnd,
    appliedGranularity,
    appliedEnvironment,
    appliedRepos,
  ])

  useEffect(() => {
    if (!appliedStart || !appliedEnd) return
    fetchDora()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    appliedScopeType,
    appliedScopeRepo,
    appliedScopeMember,
    appliedStart,
    appliedEnd,
    appliedGranularity,
    appliedEnvironment,
    appliedRepos,
  ])

  const hasPendingChanges =
    scopeType !== appliedScopeType ||
    scopeRepo !== appliedScopeRepo ||
    scopeMember !== appliedScopeMember ||
    startDate !== appliedStart ||
    endDate !== appliedEnd ||
    granularity !== appliedGranularity ||
    environment !== appliedEnvironment ||
    selectedRepos.length !== appliedRepos.length ||
    selectedRepos.some((r) => !appliedRepos.includes(r))

  const applyFilters = () => {
    setAppliedScopeType(scopeType)
    setAppliedScopeRepo(scopeRepo)
    setAppliedScopeMember(scopeMember)
    setAppliedStart(startDate)
    setAppliedEnd(endDate)
    setAppliedGranularity(granularity)
    setAppliedEnvironment(environment)
    setAppliedRepos([...selectedRepos])
  }

  const canApply =
    scopeType === 'org' ||
    (scopeType === 'repo' && !!scopeRepo) ||
    (scopeType === 'member' && !!scopeMember)

  const df = dora?.data.deployment_frequency
  const lt = dora?.data.lead_time_hours
  const cfr = dora?.data.change_failure_rate
  const rt = dora?.data.recovery_time_hours

  const dfChartData = useMemo(
    () =>
      df?.timeseries.map((p) => ({
        period: formatPeriod(p.period, appliedGranularity),
        value: p.value,
      })) ?? [],
    [df, appliedGranularity]
  )
  const ltChartData = useMemo(
    () =>
      lt?.timeseries.map((p) => ({
        period: formatPeriod(p.period, appliedGranularity),
        median: p.median,
        sample_size: p.sample_size,
      })) ?? [],
    [lt, appliedGranularity]
  )
  const cfrChartData = useMemo(
    () =>
      cfr?.timeseries.map((p) => ({
        period: formatPeriod(p.period, appliedGranularity),
        rate: p.rate === null ? 0 : p.rate * 100,
        total: p.total,
        failed: p.failed,
      })) ?? [],
    [cfr, appliedGranularity]
  )
  const rtChartData = useMemo(
    () =>
      rt?.timeseries.map((p) => ({
        period: formatPeriod(p.period, appliedGranularity),
        median: p.median,
        sample_size: p.sample_size,
      })) ?? [],
    [rt, appliedGranularity]
  )

  const renderBenchmark = (b: DoraBenchmark) => (
    <span className={`benchmark badge-${b}`}>{benchmarkLabel[b]}</span>
  )

  return (
    <div className="dora">
      <div className="dora-header">
        <h1>DORAメトリクス</h1>
      </div>

      <div className="dora-notice">
        <strong>注意:</strong> 現データソースでは Lead Time / Recovery Time / Change Failure Rate
        は近似値です。各指標のカード内の定義文も参照してください。
      </div>

      <div className="dora-filters">
        <div className="filter-row">
          <span className="filter-label">スコープ:</span>
          {(['org', 'repo', 'member'] as DoraScopeType[]).map((t) => (
            <label key={t} className="scope-radio">
              <input
                type="radio"
                name="scope"
                checked={scopeType === t}
                onChange={() => setScopeType(t)}
              />
              {t === 'org' ? '組織全体' : t === 'repo' ? 'リポジトリ' : 'メンバー'}
            </label>
          ))}
        </div>

        {scopeType === 'repo' && (
          <div className="filter-row">
            <label>
              リポジトリ:
              <select value={scopeRepo} onChange={(e) => setScopeRepo(e.target.value)}>
                <option value="">-- 選択してください --</option>
                {allRepos.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

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
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
          <label>
            終了日:
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </label>
          <label>
            粒度:
            <select
              value={granularity}
              onChange={(e) => setGranularity(e.target.value as DoraGranularity)}
            >
              <option value="day">日次</option>
              <option value="week">週次</option>
              <option value="month">月次</option>
            </select>
          </label>
          <label>
            Environment:
            <input
              type="text"
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
              className="env-input"
            />
          </label>
        </div>

        {(scopeType === 'org' || scopeType === 'member') && (
          <div className="filter-row">
            <RepositoryFilter
              repositories={allRepos}
              selectedRepos={selectedRepos}
              onChange={setSelectedRepos}
            />
          </div>
        )}

        <div className="filter-row">
          <button
            className="apply-btn"
            onClick={applyFilters}
            disabled={!canApply || loading || (!hasPendingChanges && dora !== null)}
          >
            {loading ? '読み込み中...' : '表示'}
          </button>
          {hasPendingChanges && canApply && (
            <span className="pending-hint">未適用の変更があります</span>
          )}
        </div>
      </div>

      {error && <div className="dora-error">エラー: {error}</div>}

      {dora && !loading && (
        <>
          <div className="dora-scope-info">
            <span className="scope-chip">
              {dora.scope.type === 'org' && '組織全体'}
              {dora.scope.type === 'repo' && `リポジトリ: ${dora.scope.repo}`}
              {dora.scope.type === 'member' && `メンバー: ${dora.scope.member}`}
            </span>
            <span className="range-chip">
              {new Date(dora.time_range.start).toLocaleDateString()} 〜{' '}
              {new Date(dora.time_range.end).toLocaleDateString()}
            </span>
            <span className="env-chip">env: {dora.filters.environment}</span>
          </div>

          <div className="dora-kpis">
            {df && (
              <div className="dora-card">
                <div className="card-header">
                  <h3>Deployment Frequency</h3>
                  {renderBenchmark(df.benchmark)}
                </div>
                <div className="primary-value">{df.per_day.toFixed(2)}</div>
                <div className="primary-unit">デプロイ / 日</div>
                <div className="sub-values">
                  <span>週次 {df.per_week.toFixed(2)}</span>
                  <span>合計 {df.total}</span>
                </div>
                <div className="definition">{df.definition}</div>
              </div>
            )}

            {lt && (
              <div className="dora-card">
                <div className="card-header">
                  <h3>Lead Time for Changes</h3>
                  {renderBenchmark(lt.benchmark)}
                </div>
                <div className="primary-value">{formatHours(lt.median)}</div>
                <div className="primary-unit">中央値</div>
                <div className="sub-values">
                  <span>平均 {formatHours(lt.avg)}</span>
                  <span>p90 {formatHours(lt.p90)}</span>
                  <span>p95 {formatHours(lt.p95)}</span>
                </div>
                <div className="sub-values">
                  <span>sample {lt.sample_size}</span>
                  {lt.unmatched_prs > 0 && (
                    <span className="warn">未マッチPR {lt.unmatched_prs}</span>
                  )}
                </div>
                <div className="definition">{lt.definition}</div>
              </div>
            )}

            {cfr && (
              <div className="dora-card">
                <div className="card-header">
                  <h3>Change Failure Rate</h3>
                  {renderBenchmark(cfr.benchmark)}
                </div>
                <div className="primary-value">{formatPercent(cfr.percent)}</div>
                <div className="primary-unit">デプロイ失敗率</div>
                <div className="sub-values">
                  <span>失敗 {cfr.failed_deploys}</span>
                  <span>総数 {cfr.total_deploys}</span>
                </div>
                <div className="definition">{cfr.definition}</div>
              </div>
            )}

            {rt && (
              <div className="dora-card">
                <div className="card-header">
                  <h3>Recovery Time</h3>
                  {renderBenchmark(rt.benchmark)}
                </div>
                <div className="primary-value">{formatHours(rt.median)}</div>
                <div className="primary-unit">中央値</div>
                <div className="sub-values">
                  <span>平均 {formatHours(rt.avg)}</span>
                  <span>p90 {formatHours(rt.p90)}</span>
                </div>
                <div className="sub-values">
                  <span>sample {rt.sample_size}</span>
                  {rt.unresolved_failures > 0 && (
                    <span className="warn">未復旧 {rt.unresolved_failures}</span>
                  )}
                </div>
                <div className="definition">{rt.definition}</div>
              </div>
            )}
          </div>

          <div className="dora-charts">
            <div className="chart-block">
              <h3>Deployment Frequency（期間別件数）</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={dfChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#667eea" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-block">
              <h3>Lead Time（中央値・時間）</h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={ltChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="median"
                    stroke="#2e7d32"
                    strokeWidth={2}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-block">
              <h3>Change Failure Rate（%）</h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={cfrChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="rate" stroke="#d32f2f" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-block">
              <h3>Recovery Time（中央値・時間）</h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={rtChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="median"
                    stroke="#ff9800"
                    strokeWidth={2}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {dora === null && !loading && !error && (
        <div className="dora-empty">「表示」ボタンを押してDORAメトリクスを取得してください</div>
      )}
    </div>
  )
}

export default Dora
