import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts'
import { apiClient } from '../api/client'
import type {
  ReleaseCasesResponse,
  ReleaseCasesGranularity,
  LeadTimeStats,
  ActivityReleaseCaseData,
} from '../types/api'
import RepositoryFilter from './RepositoryFilter'
import { getDefaultStartByDays, getToday, formatPeriod, formatPct, formatHours } from '../utils/format'
import { useOrgRepoMembers } from '../hooks/useOrgRepoMembers'
import './ReleaseCases.css'

interface ReleaseCasesProps {
  org: string
}

function ReleaseCases({ org }: ReleaseCasesProps) {
  const [startDate, setStartDate] = useState<string>(() => getDefaultStartByDays(365))
  const [endDate, setEndDate] = useState<string>(() => getToday())
  const [granularity, setGranularity] = useState<ReleaseCasesGranularity>('month')
  const [selectedRepos, setSelectedRepos] = useState<string[]>([])
  const [memberFilter, setMemberFilter] = useState<string>('')

  const [appliedStart, setAppliedStart] = useState<string>('')
  const [appliedEnd, setAppliedEnd] = useState<string>('')
  const [appliedGranularity, setAppliedGranularity] = useState<ReleaseCasesGranularity>('month')
  const [appliedRepos, setAppliedRepos] = useState<string[]>([])
  const [appliedMember, setAppliedMember] = useState<string>('')

  const { repos: allRepos, members: allMembers } = useOrgRepoMembers(org, 180)
  const [data, setData] = useState<ReleaseCasesResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // モーダル用state
  const [modalBranch, setModalBranch] = useState<string | null>(null)
  const [modalCases, setModalCases] = useState<
    Array<{
      feature_branch: string
      repo: string
      merger: string
      merged_at: string
      first_commit_at: string
      total_commits: number
      ai_commits: number
      is_ai: boolean
      lead_time_hours: number
    }>
  >([])
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {
        start: appliedStart,
        end: appliedEnd,
        granularity: appliedGranularity,
        ...(appliedRepos.length > 0 ? { repo: appliedRepos } : {}),
        ...(appliedMember ? { member: appliedMember } : {}),
      }
      const res = await apiClient.getReleaseCases(org, params)
      setData(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [org, appliedStart, appliedEnd, appliedGranularity, appliedRepos, appliedMember])

  useEffect(() => {
    if (!appliedStart || !appliedEnd) return
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedStart, appliedEnd, appliedGranularity, appliedRepos, appliedMember])

  const hasPendingChanges =
    startDate !== appliedStart ||
    endDate !== appliedEnd ||
    granularity !== appliedGranularity ||
    memberFilter !== appliedMember ||
    selectedRepos.length !== appliedRepos.length ||
    selectedRepos.some((r) => !appliedRepos.includes(r))

  const applyFilters = () => {
    setAppliedStart(startDate)
    setAppliedEnd(endDate)
    setAppliedGranularity(granularity)
    setAppliedRepos([...selectedRepos])
    setAppliedMember(memberFilter)
  }

  const openBranchModal = useCallback(
    async (branch: string) => {
      if (!data) return
      setModalBranch(branch)
      setModalCases([])
      setModalError(null)
      setModalLoading(true)
      try {
        const members = data.by_member.map((m) => m.member)
        const results = await Promise.all(
          members.map((m) =>
            apiClient
              .getMemberActivities(org, m, {
                start: appliedStart,
                end: appliedEnd,
                type: 'release_case',
                limit: 500,
              })
              .then((res) => ({ member: m, res }))
              .catch(() => ({ member: m, res: null as null }))
          )
        )
        const cases: typeof modalCases = []
        const seen = new Set<string>()
        for (const { member, res } of results) {
          if (!res) continue
          for (const a of res.data.activities) {
            if (a.type !== 'release_case') continue
            if (a.branch !== branch) continue
            if (appliedRepos.length > 0 && !appliedRepos.includes(a.repo)) continue
            if (seen.has(a.id)) continue
            seen.add(a.id)
            const d = a.data as ActivityReleaseCaseData
            cases.push({
              feature_branch: d.feature_branch,
              repo: a.repo,
              merger: member,
              merged_at: a.timestamp,
              first_commit_at: d.first_commit_at,
              total_commits: d.total_commits,
              ai_commits: d.ai_commits,
              is_ai: d.is_ai,
              lead_time_hours: d.lead_time_hours,
            })
          }
        }
        cases.sort((x, y) => y.merged_at.localeCompare(x.merged_at))
        setModalCases(cases)
      } catch (err) {
        setModalError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setModalLoading(false)
      }
    },
    [data, org, appliedStart, appliedEnd, appliedRepos]
  )

  const closeModal = () => {
    setModalBranch(null)
    setModalCases([])
    setModalError(null)
  }

  const tsChartData = useMemo(
    () =>
      data?.timeseries.map((p) => ({
        period: formatPeriod(p.period, appliedGranularity),
        total: p.total,
        ai: p.ai,
        rate: p.rate * 100,
        lead_time_median: p.lead_time_median,
      })) ?? [],
    [data, appliedGranularity]
  )

  const renderLeadTime = (lt: LeadTimeStats) => (
    <div className="lead-time-stats">
      <div>
        <span className="lt-label">median</span>
        <span className="lt-value">{formatHours(lt.median)}</span>
      </div>
      <div>
        <span className="lt-label">avg</span>
        <span className="lt-value">{formatHours(lt.avg)}</span>
      </div>
      <div>
        <span className="lt-label">p90</span>
        <span className="lt-value">{formatHours(lt.p90)}</span>
      </div>
      <div>
        <span className="lt-label">p95</span>
        <span className="lt-value">{formatHours(lt.p95)}</span>
      </div>
      <div>
        <span className="lt-label">sample</span>
        <span className="lt-value">{lt.sample_size}</span>
      </div>
    </div>
  )

  return (
    <div className="release-cases">
      <div className="rc-header">
        <h1>リリース案件</h1>
      </div>

      <div className="rc-notice">
        <strong>案件定義:</strong> <code>(repo, release_branch, feature_branch)</code>{' '}
        のユニーク組み合わせ 1 件 = 1 案件。同一 feature ブランチが複数回マージされても 1件 に集約。
        <br />
        <strong>リードタイム:</strong> <code>最古コミット → 最後のマージ</code> までの時間。
        <strong>代表マージ実行者:</strong> 最初にマージしたメンバー。
        <strong>所属期間:</strong> 最初のマージ日。
      </div>

      <div className="rc-filters">
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
              onChange={(e) => setGranularity(e.target.value as ReleaseCasesGranularity)}
            >
              <option value="day">日次</option>
              <option value="week">週次</option>
              <option value="month">月次</option>
            </select>
          </label>
          <label>
            マージ実行者:
            <select value={memberFilter} onChange={(e) => setMemberFilter(e.target.value)}>
              <option value="">（すべて）</option>
              {allMembers.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
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
            disabled={loading || (!hasPendingChanges && data !== null)}
          >
            {loading ? '読み込み中...' : '表示'}
          </button>
          {hasPendingChanges && (
            <span className="pending-hint">未適用の変更があります</span>
          )}
        </div>
      </div>

      {error && <div className="rc-error">エラー: {error}</div>}

      {data && !loading && (
        <>
          <div className="rc-summary-cards">
            <div className="summary-card">
              <div className="summary-label">リリース案件数</div>
              <div className="summary-value">{data.summary.total_cases.toLocaleString()}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">AI 案件数</div>
              <div className="summary-value ai-color">
                {data.summary.ai_cases.toLocaleString()}
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-label">AI率</div>
              <div className="summary-value ai-color">{formatPct(data.summary.ai_rate)}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">リードタイム中央値</div>
              <div className="summary-value">{formatHours(data.summary.lead_time.median)}</div>
              <div className="summary-sub">
                avg {formatHours(data.summary.lead_time.avg)} / p90{' '}
                {formatHours(data.summary.lead_time.p90)} / p95{' '}
                {formatHours(data.summary.lead_time.p95)}
              </div>
            </div>
          </div>

          <div className="chart-block">
            <h2>リリース案件の推移</h2>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={tsChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis yAxisId="left" allowDecimals={false} />
                <YAxis yAxisId="right" orientation="right" unit="%" domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="total" fill="#90caf9" name="全案件" />
                <Bar yAxisId="left" dataKey="ai" fill="#6f42c1" name="AI案件" />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="rate"
                  stroke="#ff9800"
                  name="AI率 (%)"
                  strokeWidth={2}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-block">
            <h2>リードタイム中央値 推移</h2>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={tsChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis unit="h" />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="lead_time_median"
                  stroke="#2e7d32"
                  strokeWidth={2}
                  name="リードタイム中央値 (h)"
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {data.by_repo && data.by_repo.length > 0 && (
            <div className="chart-block">
              <h2>リポジトリ別</h2>
              <div className="by-repo-grid">
                {data.by_repo.map((r) => (
                  <div key={r.repo} className="repo-card">
                    <div className="repo-card-header">
                      <h3>{r.repo}</h3>
                      <span className="rate-badge">{formatPct(r.rate)}</span>
                    </div>
                    <div className="repo-counts">
                      <div>
                        <span className="count-label">案件数</span>
                        <span className="count-value">{r.total.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="count-label">AI</span>
                        <span className="count-value ai-color">
                          {r.ai.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    {renderLeadTime(r.lead_time)}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="chart-block">
            <h2>
              リリースブランチ別{' '}
              <span className="count-badge">{data.by_branch.length}件</span>
            </h2>
            <table className="ranking-table">
              <thead>
                <tr>
                  <th>ブランチ</th>
                  <th>案件数</th>
                  <th>AI</th>
                  <th>AI率</th>
                  <th>ゲージ</th>
                </tr>
              </thead>
              <tbody>
                {data.by_branch.slice(0, 30).map((b) => (
                  <tr
                    key={b.branch}
                    onClick={() => openBranchModal(b.branch)}
                    className="clickable-row"
                  >
                    <td>
                      <span className="branch-name">🚀 {b.branch}</span>
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

          <div className="chart-block">
            <h2>マージ実行者別 (リリースマネージャ視点)</h2>
            <p className="hint-text">
              ※ `member` は feature 実装者ではなく release マージ実行者です。実装者別分析は AI活用度画面をご利用ください。
            </p>
            <table className="ranking-table">
              <thead>
                <tr>
                  <th>マージ実行者</th>
                  <th>案件数</th>
                  <th>AI</th>
                  <th>AI率</th>
                  <th>LT中央値</th>
                  <th>avg</th>
                  <th>p90</th>
                </tr>
              </thead>
              <tbody>
                {data.by_member.map((m) => (
                  <tr key={m.member}>
                    <td>{m.member}</td>
                    <td>{m.total.toLocaleString()}</td>
                    <td className="ai-color">{m.ai.toLocaleString()}</td>
                    <td>{formatPct(m.rate)}</td>
                    <td>{formatHours(m.lead_time.median)}</td>
                    <td>{formatHours(m.lead_time.avg)}</td>
                    <td>{formatHours(m.lead_time.p90)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {data === null && !loading && !error && (
        <div className="rc-empty">「表示」ボタンを押してリリース案件を取得してください</div>
      )}

      {modalBranch && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <span className="branch-name">🚀 {modalBranch}</span>
              </h2>
              <button className="modal-close" onClick={closeModal}>
                ×
              </button>
            </div>

            {modalLoading && <div className="modal-loading">読み込み中...</div>}
            {modalError && <div className="modal-error">エラー: {modalError}</div>}

            {!modalLoading && !modalError && (
              <>
                <div className="modal-summary">
                  <span>
                    合計 <strong>{modalCases.length}</strong> 件 (マージコミット単位)
                  </span>
                  <span>
                    ユニーク feature <strong>{new Set(modalCases.map((c) => c.feature_branch)).size}</strong> 件
                  </span>
                  <span>
                    AI <strong>{modalCases.filter((c) => c.is_ai).length}</strong> 件
                  </span>
                </div>
                <div className="modal-table-wrapper">
                  <table className="modal-table">
                    <thead>
                      <tr>
                        <th>feature ブランチ</th>
                        <th>repo</th>
                        <th>マージ日時</th>
                        <th>マージ実行者</th>
                        <th>commits</th>
                        <th>AI</th>
                        <th>LT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modalCases.map((c, idx) => (
                        <tr key={`${c.repo}-${c.feature_branch}-${c.merged_at}-${idx}`}>
                          <td className="feature-branch-cell">
                            <span className="feature-branch-name">{c.feature_branch}</span>
                          </td>
                          <td>
                            <span className="repo-chip">{c.repo}</span>
                          </td>
                          <td className="nowrap">{new Date(c.merged_at).toLocaleString()}</td>
                          <td>{c.merger}</td>
                          <td>{c.total_commits}</td>
                          <td>
                            {c.is_ai ? (
                              <span className="ai-tag">AI ({c.ai_commits})</span>
                            ) : (
                              <span className="non-ai-tag">-</span>
                            )}
                          </td>
                          <td>{formatHours(c.lead_time_hours)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ReleaseCases
