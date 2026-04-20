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
  ActivityItem,
  ActivitySummary,
  ActivityType,
  ActivityCommitData,
  ActivityPrData,
  ActivityDeployData,
} from '../types/api'
import { getDefaultStartByDays, getToday } from '../utils/format'
import './MemberActivity.css'

interface MemberActivityProps {
  org: string
}

const ALL_TYPES: ActivityType[] = ['commit', 'pull_request', 'deploy']

function MemberActivity({ org }: MemberActivityProps) {
  const [member, setMember] = useState<string>('')
  const [startDate, setStartDate] = useState<string>(() => getDefaultStartByDays(30))
  const [endDate, setEndDate] = useState<string>(() => getToday())
  const [selectedTypes, setSelectedTypes] = useState<ActivityType[]>([...ALL_TYPES])

  // 適用済み
  const [appliedMember, setAppliedMember] = useState<string>('')
  const [appliedStart, setAppliedStart] = useState<string>('')
  const [appliedEnd, setAppliedEnd] = useState<string>('')
  const [appliedTypes, setAppliedTypes] = useState<ActivityType[]>([...ALL_TYPES])

  const [allMembers, setAllMembers] = useState<string[]>([])
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [summary, setSummary] = useState<ActivitySummary | null>(null)
  const [nextCursor, setNextCursor] = useState<string>('')
  const [hasNext, setHasNext] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [loadingMore, setLoadingMore] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // メンバーリスト取得
  useEffect(() => {
    if (!org) return
    const fetchMembers = async () => {
      try {
        const res = await apiClient.getMemberRanking(org, 'commits', {
          start: getDefaultStartByDays(90),
          end: getToday(),
          limit: 1000,
        })
        const data = (res as any).data || res
        if (Array.isArray(data)) {
          const members = data
            .map((item: any) => item.Member || item.member || '')
            .filter((m: string) => m !== '')
          setAllMembers([...new Set(members)])
        }
      } catch (err) {
        console.error('Error fetching members:', err)
      }
    }
    fetchMembers()
  }, [org])

  const fetchActivities = useCallback(
    async (cursor?: string, isAppend = false) => {
      if (!appliedMember) return
      if (isAppend) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }
      setError(null)
      try {
        const typeParam =
          appliedTypes.length > 0 && appliedTypes.length < ALL_TYPES.length
            ? appliedTypes.join(',')
            : undefined
        const res = await apiClient.getMemberActivities(org, appliedMember, {
          start: appliedStart,
          end: appliedEnd,
          type: typeParam,
          limit: 100,
          cursor,
        })
        const data = res.data
        if (isAppend) {
          setActivities((prev) => [...prev, ...data.activities])
        } else {
          setActivities(data.activities)
          setSummary(data.summary)
        }
        setNextCursor(data.next_cursor || '')
        setHasNext(data.has_next)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        console.error('Error fetching activities:', err)
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [org, appliedMember, appliedStart, appliedEnd, appliedTypes]
  )

  useEffect(() => {
    if (appliedMember) {
      fetchActivities()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedMember, appliedStart, appliedEnd, appliedTypes])

  const hasPendingChanges =
    member !== appliedMember ||
    startDate !== appliedStart ||
    endDate !== appliedEnd ||
    selectedTypes.length !== appliedTypes.length ||
    selectedTypes.some((t) => !appliedTypes.includes(t))

  const applyFilters = () => {
    setAppliedMember(member)
    setAppliedStart(startDate)
    setAppliedEnd(endDate)
    setAppliedTypes([...selectedTypes])
  }

  const toggleType = (t: ActivityType) => {
    setSelectedTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    )
  }

  const dailyMetrics = useMemo(() => {
    if (activities.length === 0) return []
    const map = new Map<
      string,
      { date: string; commits: number; prs: number; deploys: number; additions: number; deletions: number }
    >()
    for (const a of activities) {
      const date = a.timestamp.split('T')[0]
      if (!map.has(date)) {
        map.set(date, { date, commits: 0, prs: 0, deploys: 0, additions: 0, deletions: 0 })
      }
      const entry = map.get(date)!
      if (a.type === 'commit') {
        entry.commits++
        const d = a.data as ActivityCommitData
        entry.additions += d.additions
        entry.deletions += d.deletions
      } else if (a.type === 'pull_request') {
        entry.prs++
      } else {
        entry.deploys++
      }
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
  }, [activities])

  const renderActivity = (a: ActivityItem) => {
    const ts = new Date(a.timestamp)
    const tsStr = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, '0')}-${String(
      ts.getDate()
    ).padStart(2, '0')} ${String(ts.getHours()).padStart(2, '0')}:${String(
      ts.getMinutes()
    ).padStart(2, '0')}`

    if (a.type === 'commit') {
      const d = a.data as ActivityCommitData
      return (
        <div key={a.id} className="activity-item activity-commit">
          <div className="activity-meta">
            <span className="activity-type type-commit">COMMIT</span>
            <span className="activity-time">{tsStr}</span>
            <span className="activity-repo">{a.repo}</span>
            {a.branch && <span className="activity-branch">🌿 {a.branch}</span>}
          </div>
          <div className="activity-body">
            <div className="commit-message">{d.message}</div>
            <div className="commit-stats">
              <span className="stat-add">+{d.additions}</span>
              <span className="stat-del">-{d.deletions}</span>
              <span className="stat-files">{d.files_changed} files</span>
              <span className="stat-sha">{d.sha.substring(0, 7)}</span>
            </div>
          </div>
        </div>
      )
    }

    if (a.type === 'pull_request') {
      const d = a.data as ActivityPrData
      return (
        <div key={a.id} className="activity-item activity-pr">
          <div className="activity-meta">
            <span className="activity-type type-pr">PR</span>
            <span className="activity-time">{tsStr}</span>
            <span className="activity-repo">{a.repo}</span>
            <span className={`pr-state state-${d.state}`}>{d.state}</span>
          </div>
          <div className="activity-body">
            <div className="pr-title">
              #{d.number} {d.title}
            </div>
            {d.merged_at && (
              <div className="pr-merged">merged: {new Date(d.merged_at).toLocaleString()}</div>
            )}
          </div>
        </div>
      )
    }

    const d = a.data as ActivityDeployData
    return (
      <div key={a.id} className="activity-item activity-deploy">
        <div className="activity-meta">
          <span className="activity-type type-deploy">DEPLOY</span>
          <span className="activity-time">{tsStr}</span>
          <span className="activity-repo">{a.repo}</span>
          <span className={`deploy-status status-${d.status}`}>{d.status}</span>
        </div>
        <div className="activity-body">
          <div className="deploy-env">env: {d.environment}</div>
          <div className="deploy-run">run: {d.workflow_run_id}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="member-activity">
      <div className="activity-header">
        <h1>メンバー活動履歴</h1>
      </div>

      <div className="activity-filters">
        <div className="filter-row">
          <label>
            メンバー:
            <select
              value={member}
              onChange={(e) => setMember(e.target.value)}
              className="member-select"
            >
              <option value="">-- 選択してください --</option>
              {allMembers.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        </div>

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
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>
        </div>

        <div className="filter-row">
          <span className="filter-label">種別:</span>
          {ALL_TYPES.map((t) => (
            <label key={t} className="type-checkbox">
              <input
                type="checkbox"
                checked={selectedTypes.includes(t)}
                onChange={() => toggleType(t)}
              />
              {t === 'commit' ? 'コミット' : t === 'pull_request' ? 'Pull Request' : 'デプロイ'}
            </label>
          ))}
        </div>

        <div className="filter-row">
          <button
            className="apply-btn"
            onClick={applyFilters}
            disabled={!member || (!hasPendingChanges && !loading) || loading}
          >
            {loading ? '読み込み中...' : '表示'}
          </button>
          {hasPendingChanges && member && (
            <span className="pending-hint">未適用の変更があります</span>
          )}
        </div>
      </div>

      {error && <div className="activity-error">エラー: {error}</div>}

      {summary && (
        <div className="activity-summary">
          <h2>サマリー</h2>
          <div className="summary-grid">
            <div className="summary-card">
              <div className="summary-label">合計</div>
              <div className="summary-value">{summary.total.toLocaleString()}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">コミット</div>
              <div className="summary-value">{summary.commits.toLocaleString()}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">Pull Request</div>
              <div className="summary-value">{summary.pull_requests.toLocaleString()}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">デプロイ</div>
              <div className="summary-value">{summary.deploys.toLocaleString()}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">追加行</div>
              <div className="summary-value add">+{summary.additions.toLocaleString()}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">削除行</div>
              <div className="summary-value del">-{summary.deletions.toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}

      {dailyMetrics.length > 0 && (
        <div className="activity-dashboard">
          <h2>時系列メトリクス</h2>
          <div className="dashboard-charts">
            <div className="chart-section">
              <h3>アクティビティ推移</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyMetrics} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={70} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="commits" stroke="#667eea" strokeWidth={2} dot={{ r: 3 }} name="コミット" />
                  <Line type="monotone" dataKey="prs" stroke="#48bb78" strokeWidth={2} dot={{ r: 3 }} name="Pull Request" />
                  <Line type="monotone" dataKey="deploys" stroke="#ed8936" strokeWidth={2} dot={{ r: 3 }} name="デプロイ" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-section">
              <h3>コード変更量</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyMetrics} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={70} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="additions" fill="#48bb78" name="追加行" />
                  <Bar dataKey="deletions" fill="#e53e3e" name="削除行" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activities.length > 0 && (
        <div className="activity-timeline">
          <h2>タイムライン</h2>
          <div className="activity-list">{activities.map(renderActivity)}</div>
          {hasNext && (
            <div className="load-more-wrapper">
              <button
                className="load-more-btn"
                onClick={() => fetchActivities(nextCursor, true)}
                disabled={loadingMore}
              >
                {loadingMore ? '読み込み中...' : 'もっと見る'}
              </button>
            </div>
          )}
        </div>
      )}

      {!loading && appliedMember && activities.length === 0 && !error && (
        <div className="activity-empty">該当する活動履歴がありません</div>
      )}
    </div>
  )
}

export default MemberActivity
