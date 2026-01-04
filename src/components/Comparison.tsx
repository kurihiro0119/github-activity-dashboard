import { useState, useEffect, useCallback, useMemo } from 'react'
import { apiClient } from '../api/client'
import type { OrgMetrics, RankingItem, RankingType } from '../types/api'
import './Comparison.css'

interface ComparisonProps {
  org: string
}

interface DateRange {
  start: string
  end: string
}

interface ComparisonMetrics {
  commits: number
  prs: number
  additions: number
  deletions: number
  deploys: number
}

interface MemberComparison {
  member: string
  period1: ComparisonMetrics
  period2: ComparisonMetrics
  diff: ComparisonMetrics
  diffPercent: ComparisonMetrics
}

function Comparison({ org }: ComparisonProps) {
  const [periodType, setPeriodType] = useState<'month' | 'week'>('month')
  const [period1Start, setPeriod1Start] = useState<string>(() => {
    const date = new Date()
    date.setMonth(date.getMonth() - 2)
    return date.toISOString().split('T')[0]
  })
  const [period2Start, setPeriod2Start] = useState<string>(() => {
    const date = new Date()
    date.setMonth(date.getMonth() - 1)
    return date.toISOString().split('T')[0]
  })
  const [days, setDays] = useState<number>(30)
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [allMembers, setAllMembers] = useState<string[]>([])
  const [orgMetrics1, setOrgMetrics1] = useState<OrgMetrics | null>(null)
  const [orgMetrics2, setOrgMetrics2] = useState<OrgMetrics | null>(null)
  const [memberComparisons, setMemberComparisons] = useState<MemberComparison[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 開始日と日数から終了日を計算
  const calculateEndDate = useCallback((startDate: string, days: number): string => {
    const start = new Date(startDate)
    const end = new Date(start)
    end.setDate(end.getDate() + days - 1) // 開始日を含めてdays日分
    return end.toISOString().split('T')[0]
  }, [])

  // 期間タイプに応じて日数と開始日を自動設定
  const updatePeriodsByType = useCallback((type: 'month' | 'week') => {
    const now = new Date()
    if (type === 'month') {
      setDays(30)
      const month1Start = new Date(now)
      month1Start.setMonth(month1Start.getMonth() - 2)
      const month2Start = new Date(now)
      month2Start.setMonth(month2Start.getMonth() - 1)
      setPeriod1Start(month1Start.toISOString().split('T')[0])
      setPeriod2Start(month2Start.toISOString().split('T')[0])
    } else {
      setDays(7)
      const week1Start = new Date(now)
      week1Start.setDate(week1Start.getDate() - 14)
      const week2Start = new Date(now)
      week2Start.setDate(week2Start.getDate() - 7)
      setPeriod1Start(week1Start.toISOString().split('T')[0])
      setPeriod2Start(week2Start.toISOString().split('T')[0])
    }
  }, [])

  useEffect(() => {
    updatePeriodsByType(periodType)
  }, [periodType, updatePeriodsByType])

  // 実際の期間を計算
  const period1: DateRange = useMemo(() => ({
    start: period1Start,
    end: calculateEndDate(period1Start, days),
  }), [period1Start, days, calculateEndDate])

  const period2: DateRange = useMemo(() => ({
    start: period2Start,
    end: calculateEndDate(period2Start, days),
  }), [period2Start, days, calculateEndDate])

  // メンバーリストを取得
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        // 両期間をカバーする範囲でメンバーを取得
        const startDate = period1.start < period2.start ? period1.start : period2.start
        const endDate = period1.end > period2.end ? period1.end : period2.end
        const res = await apiClient.getMemberRanking(org, 'commits', {
          start: startDate,
          end: endDate,
          limit: 1000,
        })
        const data = res.data || res
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
    if (org) {
      fetchMembers()
    }
  }, [org, period1.start, period1.end, period2.start, period2.end])

  const fetchComparisonData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // 組織全体のメトリクスを取得
      const [metrics1Res, metrics2Res] = await Promise.all([
        apiClient.getOrgMetrics(org, { start: period1.start, end: period1.end }),
        apiClient.getOrgMetrics(org, { start: period2.start, end: period2.end }),
      ])

      const metrics1Raw = metrics1Res.data || metrics1Res
      const metrics2Raw = metrics2Res.data || metrics2Res

      const metrics1: OrgMetrics = {
        org: metrics1Raw.Org || metrics1Raw.org || org,
        total_repos: metrics1Raw.TotalRepos || metrics1Raw.Total_Repos || metrics1Raw.total_repos || 0,
        total_members: metrics1Raw.TotalMembers || metrics1Raw.Total_Members || metrics1Raw.total_members || 0,
        commits: metrics1Raw.Commits || metrics1Raw.commits || 0,
        prs: metrics1Raw.PRs || metrics1Raw.Prs || metrics1Raw.prs || 0,
        additions: metrics1Raw.Additions || metrics1Raw.additions || 0,
        deletions: metrics1Raw.Deletions || metrics1Raw.deletions || 0,
        deploys: metrics1Raw.Deploys || metrics1Raw.deploys || 0,
      }

      const metrics2: OrgMetrics = {
        org: metrics2Raw.Org || metrics2Raw.org || org,
        total_repos: metrics2Raw.TotalRepos || metrics2Raw.Total_Repos || metrics2Raw.total_repos || 0,
        total_members: metrics2Raw.TotalMembers || metrics2Raw.Total_Members || metrics2Raw.total_members || 0,
        commits: metrics2Raw.Commits || metrics2Raw.commits || 0,
        prs: metrics2Raw.PRs || metrics2Raw.Prs || metrics2Raw.prs || 0,
        additions: metrics2Raw.Additions || metrics2Raw.additions || 0,
        deletions: metrics2Raw.Deletions || metrics2Raw.deletions || 0,
        deploys: metrics2Raw.Deploys || metrics2Raw.deploys || 0,
      }

      setOrgMetrics1(metrics1)
      setOrgMetrics2(metrics2)

      // メンバー比較データを取得
      if (selectedMembers.length > 0) {
        // 期間1と期間2の全メンバーランキングを一度に取得
        const [member1Res, member2Res] = await Promise.all([
          apiClient.getMemberRanking(org, 'commits', {
            start: period1.start,
            end: period1.end,
            limit: 1000,
          }),
          apiClient.getMemberRanking(org, 'commits', {
            start: period2.start,
            end: period2.end,
            limit: 1000,
          }),
        ])

        const members1 = (member1Res.data || member1Res) as any[]
        const members2 = (member2Res.data || member2Res) as any[]

        // メンバーマップを作成（高速検索用）
        const members1Map = new Map<string, any>()
        const members2Map = new Map<string, any>()

        if (Array.isArray(members1)) {
          members1.forEach((m: any) => {
            const memberName = m.Member || m.member
            if (memberName) {
              members1Map.set(memberName, m)
            }
          })
        }

        if (Array.isArray(members2)) {
          members2.forEach((m: any) => {
            const memberName = m.Member || m.member
            if (memberName) {
              members2Map.set(memberName, m)
            }
          })
        }

        // 選択されたメンバーごとに比較データを作成
        const comparisons = selectedMembers.map((member) => {
          const member1 = members1Map.get(member)
          const member2 = members2Map.get(member)

          const period1Metrics: ComparisonMetrics = member1
            ? {
                commits: member1.Commits || member1.commits || 0,
                prs: member1.PRs || member1.Prs || member1.prs || 0,
                additions: member1.Additions || member1.additions || 0,
                deletions: member1.Deletions || member1.deletions || 0,
                deploys: member1.Deploys || member1.deploys || 0,
              }
            : { commits: 0, prs: 0, additions: 0, deletions: 0, deploys: 0 }

          const period2Metrics: ComparisonMetrics = member2
            ? {
                commits: member2.Commits || member2.commits || 0,
                prs: member2.PRs || member2.Prs || member2.prs || 0,
                additions: member2.Additions || member2.additions || 0,
                deletions: member2.Deletions || member2.deletions || 0,
                deploys: member2.Deploys || member2.deploys || 0,
              }
            : { commits: 0, prs: 0, additions: 0, deletions: 0, deploys: 0 }

          const diff: ComparisonMetrics = {
            commits: period2Metrics.commits - period1Metrics.commits,
            prs: period2Metrics.prs - period1Metrics.prs,
            additions: period2Metrics.additions - period1Metrics.additions,
            deletions: period2Metrics.deletions - period1Metrics.deletions,
            deploys: period2Metrics.deploys - period1Metrics.deploys,
          }

          const diffPercent: ComparisonMetrics = {
            commits: period1Metrics.commits !== 0 ? (diff.commits / period1Metrics.commits) * 100 : (period2Metrics.commits > 0 ? 100 : 0),
            prs: period1Metrics.prs !== 0 ? (diff.prs / period1Metrics.prs) * 100 : (period2Metrics.prs > 0 ? 100 : 0),
            additions: period1Metrics.additions !== 0 ? (diff.additions / period1Metrics.additions) * 100 : (period2Metrics.additions > 0 ? 100 : 0),
            deletions: period1Metrics.deletions !== 0 ? (diff.deletions / period1Metrics.deletions) * 100 : (period2Metrics.deletions > 0 ? 100 : 0),
            deploys: period1Metrics.deploys !== 0 ? (diff.deploys / period1Metrics.deploys) * 100 : (period2Metrics.deploys > 0 ? 100 : 0),
          }

          return {
            member,
            period1: period1Metrics,
            period2: period2Metrics,
            diff,
            diffPercent,
          }
        })

        setMemberComparisons(comparisons)
      } else {
        setMemberComparisons([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error('Error fetching comparison data:', err)
    } finally {
      setLoading(false)
    }
  }, [org, period1, period2, selectedMembers])

  useEffect(() => {
    if (org) {
      fetchComparisonData()
    }
  }, [org, fetchComparisonData])

  const formatDiff = (value: number, percent: number) => {
    const sign = value >= 0 ? '+' : ''
    const percentSign = percent >= 0 ? '+' : ''
    return (
      <span className={value >= 0 ? 'diff-positive' : 'diff-negative'}>
        {sign}{value.toLocaleString()} ({percentSign}{percent.toFixed(1)}%)
      </span>
    )
  }

  const orgDiff = orgMetrics1 && orgMetrics2
    ? {
        commits: orgMetrics2.commits - orgMetrics1.commits,
        prs: orgMetrics2.prs - orgMetrics1.prs,
        additions: orgMetrics2.additions - orgMetrics1.additions,
        deletions: orgMetrics2.deletions - orgMetrics1.deletions,
        deploys: orgMetrics2.deploys - orgMetrics1.deploys,
      }
    : null

  const orgDiffPercent = orgMetrics1 && orgDiff
    ? {
        commits: orgMetrics1.commits !== 0 ? (orgDiff.commits / orgMetrics1.commits) * 100 : (orgMetrics2!.commits > 0 ? 100 : 0),
        prs: orgMetrics1.prs !== 0 ? (orgDiff.prs / orgMetrics1.prs) * 100 : (orgMetrics2!.prs > 0 ? 100 : 0),
        additions: orgMetrics1.additions !== 0 ? (orgDiff.additions / orgMetrics1.additions) * 100 : (orgMetrics2!.additions > 0 ? 100 : 0),
        deletions: orgMetrics1.deletions !== 0 ? (orgDiff.deletions / orgMetrics1.deletions) * 100 : (orgMetrics2!.deletions > 0 ? 100 : 0),
        deploys: orgMetrics1.deploys !== 0 ? (orgDiff.deploys / orgMetrics1.deploys) * 100 : (orgMetrics2!.deploys > 0 ? 100 : 0),
      }
    : null

  if (loading) {
    return (
      <div className="comparison-loading">
        <div className="spinner"></div>
        <p>データを読み込み中...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="comparison-error">
        <p>エラー: {error}</p>
        <button onClick={fetchComparisonData} className="retry-btn">
          再試行
        </button>
      </div>
    )
  }

  return (
    <div className="comparison">
      <div className="comparison-header">
        <h1>期間比較</h1>
        <div className="period-type-selector">
          <label>期間タイプ:</label>
          <select
            value={periodType}
            onChange={(e) => setPeriodType(e.target.value as 'month' | 'week')}
            className="type-select"
          >
            <option value="month">1ヶ月間</option>
            <option value="week">1週間</option>
          </select>
        </div>
      </div>

      <div className="period-selectors">
        <div className="days-selector">
          <label>
            日数:
            <input
              type="number"
              min="1"
              max="365"
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value) || 1)}
              className="days-input"
            />
          </label>
          <span className="days-hint">（各期間の日数を指定）</span>
        </div>

        <div className="period-selector">
          <h3>期間1</h3>
          <div className="date-inputs">
            <label>
              開始日:
              <input
                type="date"
                value={period1Start}
                onChange={(e) => setPeriod1Start(e.target.value)}
              />
            </label>
            <div className="period-info">
              終了日: {period1.end}
            </div>
          </div>
        </div>

        <div className="period-selector">
          <h3>期間2</h3>
          <div className="date-inputs">
            <label>
              開始日:
              <input
                type="date"
                value={period2Start}
                onChange={(e) => setPeriod2Start(e.target.value)}
              />
            </label>
            <div className="period-info">
              終了日: {period2.end}
            </div>
          </div>
        </div>
      </div>

      <div className="member-filter">
        <h3>メンバーフィルター（オプション）</h3>
        <div className="member-checkboxes">
          {allMembers.map((member) => (
            <label key={member} className="member-checkbox">
              <input
                type="checkbox"
                checked={selectedMembers.includes(member)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedMembers([...selectedMembers, member])
                  } else {
                    setSelectedMembers(selectedMembers.filter((m) => m !== member))
                  }
                }}
              />
              {member}
            </label>
          ))}
        </div>
        {selectedMembers.length > 0 && (
          <button
            className="clear-members-btn"
            onClick={() => setSelectedMembers([])}
          >
            選択をクリア
          </button>
        )}
      </div>

      <div className="comparison-results">
        <div className="org-comparison">
          <h2>組織全体の比較</h2>
          {orgMetrics1 && orgMetrics2 && orgDiff && orgDiffPercent ? (
            <div className="comparison-table">
              <table>
                <thead>
                  <tr>
                    <th>メトリクス</th>
                    <th>期間1</th>
                    <th>期間2</th>
                    <th>差分</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Commits</td>
                    <td>{orgMetrics1.commits.toLocaleString()}</td>
                    <td>{orgMetrics2.commits.toLocaleString()}</td>
                    <td>{formatDiff(orgDiff.commits, orgDiffPercent.commits)}</td>
                  </tr>
                  <tr>
                    <td>Pull Requests</td>
                    <td>{orgMetrics1.prs.toLocaleString()}</td>
                    <td>{orgMetrics2.prs.toLocaleString()}</td>
                    <td>{formatDiff(orgDiff.prs, orgDiffPercent.prs)}</td>
                  </tr>
                  <tr>
                    <td>コード追加</td>
                    <td>{orgMetrics1.additions.toLocaleString()}</td>
                    <td>{orgMetrics2.additions.toLocaleString()}</td>
                    <td>{formatDiff(orgDiff.additions, orgDiffPercent.additions)}</td>
                  </tr>
                  <tr>
                    <td>コード削除</td>
                    <td>{orgMetrics1.deletions.toLocaleString()}</td>
                    <td>{orgMetrics2.deletions.toLocaleString()}</td>
                    <td>{formatDiff(orgDiff.deletions, orgDiffPercent.deletions)}</td>
                  </tr>
                  <tr>
                    <td>Deploys</td>
                    <td>{orgMetrics1.deploys.toLocaleString()}</td>
                    <td>{orgMetrics2.deploys.toLocaleString()}</td>
                    <td>{formatDiff(orgDiff.deploys, orgDiffPercent.deploys)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <p>データがありません</p>
          )}
        </div>

        {selectedMembers.length > 0 && (
          <div className="member-comparison">
            <h2>メンバー別比較</h2>
            {memberComparisons.length > 0 ? (
              <div className="member-comparison-grid">
                {memberComparisons.map((comp) => (
                  <div key={comp.member} className="member-comparison-card">
                    <h3>{comp.member}</h3>
                    <div className="member-metrics">
                      <div className="metric-row">
                        <span className="metric-label">Commits</span>
                        <span className="metric-value">{comp.period1.commits.toLocaleString()}</span>
                        <span className="metric-arrow">→</span>
                        <span className="metric-value">{comp.period2.commits.toLocaleString()}</span>
                        <span className="metric-diff">{formatDiff(comp.diff.commits, comp.diffPercent.commits)}</span>
                      </div>
                      <div className="metric-row">
                        <span className="metric-label">Pull Requests</span>
                        <span className="metric-value">{comp.period1.prs.toLocaleString()}</span>
                        <span className="metric-arrow">→</span>
                        <span className="metric-value">{comp.period2.prs.toLocaleString()}</span>
                        <span className="metric-diff">{formatDiff(comp.diff.prs, comp.diffPercent.prs)}</span>
                      </div>
                      <div className="metric-row">
                        <span className="metric-label">コード追加</span>
                        <span className="metric-value">{comp.period1.additions.toLocaleString()}</span>
                        <span className="metric-arrow">→</span>
                        <span className="metric-value">{comp.period2.additions.toLocaleString()}</span>
                        <span className="metric-diff">{formatDiff(comp.diff.additions, comp.diffPercent.additions)}</span>
                      </div>
                      <div className="metric-row">
                        <span className="metric-label">コード削除</span>
                        <span className="metric-value">{comp.period1.deletions.toLocaleString()}</span>
                        <span className="metric-arrow">→</span>
                        <span className="metric-value">{comp.period2.deletions.toLocaleString()}</span>
                        <span className="metric-diff">{formatDiff(comp.diff.deletions, comp.diffPercent.deletions)}</span>
                      </div>
                      <div className="metric-row">
                        <span className="metric-label">Deploys</span>
                        <span className="metric-value">{comp.period1.deploys.toLocaleString()}</span>
                        <span className="metric-arrow">→</span>
                        <span className="metric-value">{comp.period2.deploys.toLocaleString()}</span>
                        <span className="metric-diff">{formatDiff(comp.diff.deploys, comp.diffPercent.deploys)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>データを読み込み中...</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Comparison

