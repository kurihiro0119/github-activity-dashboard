import { useState, useEffect, useMemo, useCallback } from 'react'
import { apiClient } from '../api/client'
import type { OrgMetrics, TimeseriesData, RankingItem, RankingType } from '../types/api'
import MetricsCard from './MetricsCard'
import RankingTable from './RankingTable'
import TimeseriesChart from './TimeseriesChart'
import DateRangePicker from './DateRangePicker'
import RepositoryFilter from './RepositoryFilter'
import './Dashboard.css'

interface DashboardProps {
  org: string
}

interface DateRange {
  start: string
  end: string
}

function Dashboard({ org }: DashboardProps) {
  const [orgMetrics, setOrgMetrics] = useState<OrgMetrics | null>(null)
  const [timeseries, setTimeseries] = useState<TimeseriesData[] | null>(null)
  const [memberRanking, setMemberRanking] = useState<RankingItem[] | null>(null)
  const [repoRanking, setRepoRanking] = useState<RankingItem[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRange>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  })
  const [rankingType, setRankingType] = useState<RankingType>('commits')
  const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('week')
  const [selectedRepos, setSelectedRepos] = useState<string[]>([])
  const [allRepos, setAllRepos] = useState<string[]>([])
  const [orgTotalRepos, setOrgTotalRepos] = useState<number>(0)
  const [orgTotalMembers, setOrgTotalMembers] = useState<number>(0)

  // 期間を分割する関数
  const splitDateRange = (start: string, end: string, interval: 'day' | 'week' | 'month'): Array<{ start: string; end: string }> => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    const ranges: Array<{ start: string; end: string }> = []

    let currentStart = new Date(startDate)

    while (currentStart < endDate) {
      let currentEnd = new Date(currentStart)

      switch (interval) {
        case 'day':
          currentEnd.setDate(currentEnd.getDate() + 1)
          break
        case 'week':
          currentEnd.setDate(currentEnd.getDate() + 7)
          break
        case 'month':
          currentEnd.setMonth(currentEnd.getMonth() + 1)
          break
      }

      // 最終期間は終了日を超えないようにする
      if (currentEnd > endDate) {
        currentEnd = new Date(endDate)
      }

      ranges.push({
        start: currentStart.toISOString().split('T')[0],
        end: currentEnd.toISOString().split('T')[0],
      })

      currentStart = new Date(currentEnd)
    }

    return ranges
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: any = {
        start: dateRange.start,
        end: dateRange.end,
      }

      // 組織全体のメトリクスを取得（リポジトリ数とメンバー数用、常にフィルターなし）
      const orgMetricsRes = await apiClient.getOrgMetrics(org, params)
      const orgMetricsRaw = orgMetricsRes.data || orgMetricsRes
      const orgTotalReposValue = orgMetricsRaw.TotalRepos || orgMetricsRaw.Total_Repos || orgMetricsRaw.total_repos || 0
      const orgTotalMembersValue = orgMetricsRaw.TotalMembers || orgMetricsRaw.Total_Members || orgMetricsRaw.total_members || 0
      
      if (orgTotalReposValue > 0) {
        setOrgTotalRepos(orgTotalReposValue)
      }
      if (orgTotalMembersValue > 0) {
        setOrgTotalMembers(orgTotalMembersValue)
      }

      let metricsRes: any
      let tsRes: any
      let membersRes: any
      let reposRes: any

      if (selectedRepos.length > 0) {
        // リポジトリが選択されている場合：各リポジトリのメトリクスを取得して集計
        console.log('リポジトリフィルター適用:', selectedRepos)
        
        // 各リポジトリのメトリクスを取得
        const repoMetricsPromises = selectedRepos.map((repo) =>
          apiClient.getRepoMetrics(org, repo, params).catch((err) => {
            console.error(`Failed to fetch metrics for repo ${repo}:`, err)
            return null
          })
        )

        // 各リポジトリの時系列データを取得
        const repoTimeseriesPromises = selectedRepos.map((repo) =>
          apiClient.getRepoTimeseries(org, repo, { ...params, granularity: 'day' }).catch((err) => {
            console.error(`Failed to fetch timeseries for repo ${repo}:`, err)
            return null
          })
        )

        const [repoMetricsResults, repoTimeseriesResults] = await Promise.all([
          Promise.all(repoMetricsPromises),
          Promise.all(repoTimeseriesPromises),
        ])

        // メトリクスを集計
        const aggregatedMetrics = repoMetricsResults
          .filter((res) => res !== null)
          .reduce((acc: any, res: any) => {
            const data = res.data || res
            return {
              commits: (acc.commits || 0) + (data.Commits || data.commits || 0),
              prs: (acc.prs || 0) + (data.PRs || data.Prs || data.prs || 0),
              additions: (acc.additions || 0) + (data.Additions || data.additions || 0),
              deletions: (acc.deletions || 0) + (data.Deletions || data.deletions || 0),
              deploys: (acc.deploys || 0) + (data.Deploys || data.deploys || 0),
            }
          }, {})

        metricsRes = { data: aggregatedMetrics }

        // 時系列データを集計（タイムスタンプごとに合計）
        const timeseriesMap = new Map<string, any>()
        
        // タイムスタンプを日付文字列に正規化する関数
        const normalizeTimestamp = (ts: string): string => {
          if (!ts) return ''
          // ISO形式のタイムスタンプを日付文字列に変換
          try {
            const date = new Date(ts)
            if (!isNaN(date.getTime())) {
              return date.toISOString().split('T')[0] // YYYY-MM-DD形式
            }
          } catch (e) {
            // 既に日付文字列形式の場合はそのまま返す
            if (ts.match(/^\d{4}-\d{2}-\d{2}/)) {
              return ts.split('T')[0].split(' ')[0]
            }
          }
          return ts
        }

        repoTimeseriesResults
          .filter((res) => res !== null)
          .forEach((res: any) => {
            const data = res.data || res
            let dataPoints: any[] = []
            
            if (Array.isArray(data)) {
              dataPoints = data
            } else if (data.dataPoints && Array.isArray(data.dataPoints)) {
              dataPoints = data.dataPoints
            } else if (data.DataPoints && Array.isArray(data.DataPoints)) {
              dataPoints = data.DataPoints
            }

            dataPoints.forEach((point: any) => {
              const rawTimestamp = point.timestamp || point.Timestamp || point.date || point.Date || point.period || point.Period
              if (!rawTimestamp) return

              const normalizedTimestamp = normalizeTimestamp(rawTimestamp)
              if (!normalizedTimestamp) return

              const existing = timeseriesMap.get(normalizedTimestamp) || {
                timestamp: normalizedTimestamp,
                commits: 0,
                prs: 0,
                additions: 0,
                deletions: 0,
                deploys: 0,
              }

              existing.commits += point.Commits || point.commits || 0
              existing.prs += point.PRs || point.Prs || point.prs || 0
              existing.additions += point.Additions || point.additions || 0
              existing.deletions += point.Deletions || point.deletions || 0
              existing.deploys += point.Deploys || point.deploys || 0

              timeseriesMap.set(normalizedTimestamp, existing)
            })
          })

        tsRes = {
          data: {
            granularity: 'day',
            dataPoints: Array.from(timeseriesMap.values()).sort((a, b) =>
              a.timestamp.localeCompare(b.timestamp)
            ),
          },
        }

        // 各リポジトリのメンバーメトリクスを取得して集計
        const repoMembersPromises = selectedRepos.map((repo) =>
          apiClient.getRepoMembersMetrics(org, repo, params).catch((err) => {
            console.error(`Failed to fetch members metrics for repo ${repo}:`, err)
            return null
          })
        )

        const repoMembersResults = await Promise.all(repoMembersPromises)

        // メンバーごとにメトリクスを集計
        const membersMap = new Map<string, any>()
        repoMembersResults
          .filter((res) => res !== null)
          .forEach((res: any) => {
            const membersData = res.data || res
            const members = Array.isArray(membersData) ? membersData : []
            
            members.forEach((member: any) => {
              const memberName = member.Member || member.member || member.name
              if (!memberName) return

              const existing = membersMap.get(memberName) || {
                member: memberName,
                commits: 0,
                prs: 0,
                additions: 0,
                deletions: 0,
                deploys: 0,
              }

              existing.commits += member.Commits || member.commits || 0
              existing.prs += member.PRs || member.Prs || member.prs || 0
              existing.additions += member.Additions || member.additions || 0
              existing.deletions += member.Deletions || member.deletions || 0
              existing.deploys += member.Deploys || member.deploys || 0

              membersMap.set(memberName, existing)
            })
          })

        // ランキングタイプに応じてソートしてランキングを付与
        const membersArray = Array.from(membersMap.values())
        const getValue = (member: any) => {
          switch (rankingType) {
            case 'commits':
              return member.commits
            case 'prs':
              return member.prs
            case 'code-changes':
              return (member.additions || 0) + (member.deletions || 0)
            case 'deploys':
              return member.deploys
            default:
              return member.commits
          }
        }

        membersArray.sort((a, b) => getValue(b) - getValue(a))
        const rankedMembers = membersArray.slice(0, 10).map((member, index) => ({
          rank: index + 1,
          member: member.member,
          value: getValue(member),
          commits: member.commits,
          prs: member.prs,
          additions: member.additions,
          deletions: member.deletions,
          deploys: member.deploys,
        }))

        membersRes = { data: rankedMembers }

        // リポジトリランキングは通常通り取得
        reposRes = await apiClient.getRepoRanking(org, rankingType, { ...params, limit: 10 })
      } else {
        // リポジトリが選択されていない場合：組織全体のメトリクスを使用
        console.log('リポジトリフィルターなし（全リポジトリ）')
        
        ;[metricsRes, tsRes, membersRes, reposRes] = await Promise.all([
          apiClient.getOrgMetrics(org, params),
          apiClient.getDetailedTimeseries(org, { ...params, granularity: 'day' }),
          apiClient.getMemberRanking(org, rankingType, { ...params, limit: 10 }),
          apiClient.getRepoRanking(org, rankingType, { ...params, limit: 10 }),
        ])
      }

      console.log('API Response:', { metricsRes, tsRes, membersRes, reposRes })

      // APIレスポンスの構造に応じて柔軟に対応
      const metricsRaw = metricsRes.data || metricsRes
      const tsData = tsRes.data || tsRes
      const membersData = membersRes.data || membersRes
      const reposData = reposRes.data || reposRes

      // メトリクスデータのプロパティ名を大文字→小文字に変換
      // リポジトリ数とメンバー数は組織全体の値を使用（フィルター適用時も組織全体の値を表示）
      const metrics: OrgMetrics = {
        org: metricsRaw.Org || metricsRaw.org || org,
        total_repos: orgTotalReposValue || 0,
        total_members: orgTotalMembersValue || 0,
        commits: metricsRaw.Commits || metricsRaw.commits || 0,
        prs: metricsRaw.PRs || metricsRaw.Prs || metricsRaw.prs || 0,
        additions: metricsRaw.Additions || metricsRaw.additions || 0,
        deletions: metricsRaw.Deletions || metricsRaw.deletions || 0,
        deploys: metricsRaw.Deploys || metricsRaw.deploys || 0,
      }

      // ランキングデータのプロパティ名を大文字→小文字に変換
      const normalizeRankingItem = (item: any) => ({
        rank: item.Rank || item.rank,
        member: item.Member || item.member,
        repo: item.Repo || item.repo,
        value: item.Value || item.value,
        commits: item.Commits || item.commits || 0,
        prs: item.PRs || item.Prs || item.prs || 0,
        additions: item.Additions || item.additions,
        deletions: item.Deletions || item.deletions,
        deploys: item.Deploys || item.deploys || 0,
      })

      const members = Array.isArray(membersData)
        ? membersData.map(normalizeRankingItem)
        : []
      const repos = Array.isArray(reposData)
        ? reposData.map(normalizeRankingItem)
        : []

      // 時系列データの処理
      let ts: TimeseriesData[] = []
      console.log('tsData structure:', tsData, 'isArray:', Array.isArray(tsData), 'type:', typeof tsData)
      
      // タイムスタンプを日付文字列に正規化する関数
      const normalizeTimestamp = (ts: string): string => {
        if (!ts) return ''
        try {
          const date = new Date(ts)
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0] // YYYY-MM-DD形式
          }
        } catch (e) {
          if (ts.match(/^\d{4}-\d{2}-\d{2}/)) {
            return ts.split('T')[0].split(' ')[0]
          }
        }
        return ts
      }

      const parseDataPoint = (item: any) => {
        const rawTimestamp = item.timestamp || item.Timestamp || item.Date || item.date || item.period || item.Period || ''
        const normalizedDate = normalizeTimestamp(rawTimestamp)
        return {
          date: normalizedDate,
          period: normalizedDate,
          commits: item.Commits || item.commits || 0,
          prs: item.PRs || item.Prs || item.prs || 0,
          additions: item.Additions || item.additions || 0,
          deletions: item.Deletions || item.deletions || 0,
          deploys: item.Deploys || item.deploys || 0,
        }
      }
      
      if (!tsData || (typeof tsData === 'object' && Object.keys(tsData).length === 0)) {
        console.log('時系列データが空です')
        ts = []
      } else if (Array.isArray(tsData)) {
        ts = tsData.map(parseDataPoint).filter((item) => item.date !== '')
      } else if (tsData && typeof tsData === 'object') {
        // DataPoints プロパティがある場合（詳細時系列APIのレスポンス）
        if (tsData.DataPoints && Array.isArray(tsData.DataPoints)) {
          ts = tsData.DataPoints.map(parseDataPoint).filter((item) => item.date !== '')
        } else if (tsData.dataPoints && Array.isArray(tsData.dataPoints)) {
          ts = tsData.dataPoints.map(parseDataPoint).filter((item) => item.date !== '')
        } else {
          // オブジェクトの場合は配列に変換を試みる
          const entries = Object.entries(tsData).filter(([key]) => 
            !['Type', 'Granularity', 'DataPoints', 'type', 'granularity', 'dataPoints'].includes(key)
          )
          if (entries.length > 0) {
            ts = entries.map(([key, value]: [string, any]) => ({
              date: normalizeTimestamp(key),
              period: normalizeTimestamp(key),
              commits: value?.Commits || value?.commits || 0,
              prs: value?.PRs || value?.Prs || value?.prs || 0,
              additions: value?.Additions || value?.additions || 0,
              deletions: value?.Deletions || value?.deletions || 0,
              deploys: value?.Deploys || value?.deploys || 0,
            })).filter((item) => item.date !== '')
          }
        }
      }
      
      console.log('Parsed timeseries:', ts, 'length:', ts.length)

      console.log('Parsed data:', { metrics, ts, members, repos })

      setOrgMetrics(metrics)
      setTimeseries(ts)
      setMemberRanking(members)
      setRepoRanking(repos)
      
      // リポジトリリストを更新（フィルターなしで取得した全リポジトリから）
      // リポジトリランキングから全リポジトリのリストを取得
      if (repos.length > 0) {
        const repoList = repos.map((r) => r.repo || '').filter((r) => r !== '')
        if (repoList.length > 0) {
          // 既存のリストとマージして重複を除去
          const mergedList = [...new Set([...allRepos, ...repoList])]
          if (JSON.stringify(mergedList.sort()) !== JSON.stringify(allRepos.sort())) {
            setAllRepos(mergedList)
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }, [org, dateRange, rankingType, selectedRepos, granularity])

  // リポジトリリストを取得（初期ロード時とorg変更時のみ）
  useEffect(() => {
    if (org && allRepos.length === 0) {
      const fetchRepos = async () => {
        try {
          const reposRes = await apiClient.getRepoRanking(org, 'commits', {
            start: dateRange.start,
            end: dateRange.end,
            limit: 1000, // 多くのリポジトリを取得
          })
          const reposData = reposRes.data || reposRes
          if (Array.isArray(reposData) && reposData.length > 0) {
            const repoList = reposData
              .map((r: any) => r.Repo || r.repo || '')
              .filter((r: string) => r !== '')
            if (repoList.length > 0) {
              setAllRepos(repoList)
            }
          }
        } catch (err) {
          console.error('Error fetching repositories:', err)
        }
      }
      fetchRepos()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org])

  useEffect(() => {
    if (org) {
      console.log('fetchData呼び出し:', { org, dateRange, rankingType, selectedRepos })
      fetchData()
    }
  }, [org, fetchData])

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>データを読み込み中...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>エラー: {error}</p>
        <button onClick={fetchData} className="retry-btn">
          再試行
        </button>
      </div>
    )
  }

  console.log('Render state:', { orgMetrics, timeseries, memberRanking, repoRanking })

  return (
    <div className="dashboard">
      <div className="dashboard-controls">
        <DateRangePicker
          start={dateRange.start}
          end={dateRange.end}
          onChange={setDateRange}
        />
        <div className="ranking-type-selector">
          <label>ランキングタイプ:</label>
          <select
            value={rankingType}
            onChange={(e) => setRankingType(e.target.value as RankingType)}
            className="type-select"
          >
            <option value="commits">Commits</option>
            <option value="prs">Pull Requests</option>
            <option value="code-changes">Code Changes</option>
            <option value="deploys">Deploys</option>
          </select>
        </div>
        {allRepos.length > 0 && (
          <RepositoryFilter
            repositories={allRepos}
            selectedRepos={selectedRepos}
            onChange={(repos) => {
              console.log('Dashboard: selectedRepos変更', { old: selectedRepos, new: repos })
              setSelectedRepos(repos)
            }}
          />
        )}
      </div>

      {orgMetrics ? (
        <div className="metrics-grid">
          <MetricsCard title="リポジトリ数" value={orgMetrics.total_repos} isFiltered={false} />
          <MetricsCard title="メンバー数" value={orgMetrics.total_members} isFiltered={false} />
          <MetricsCard title="Commits" value={orgMetrics.commits?.toLocaleString()} isFiltered={selectedRepos.length > 0} />
          <MetricsCard title="Pull Requests" value={orgMetrics.prs?.toLocaleString()} isFiltered={selectedRepos.length > 0} />
          <MetricsCard
            title="コード追加"
            value={orgMetrics.additions?.toLocaleString()}
            isFiltered={selectedRepos.length > 0}
          />
          <MetricsCard
            title="コード削除"
            value={orgMetrics.deletions?.toLocaleString()}
            isFiltered={selectedRepos.length > 0}
          />
          <MetricsCard title="Deploys" value={orgMetrics.deploys?.toLocaleString()} isFiltered={selectedRepos.length > 0} />
        </div>
      ) : (
        <div className="no-data-message">
          <p>メトリクスデータがありません</p>
        </div>
      )}

      <div className={`chart-section ${selectedRepos.length > 0 ? 'filtered' : ''}`}>
        <div className="section-header">
          <h2>時系列メトリクス</h2>
          {selectedRepos.length > 0 && (
            <span className="filter-indicator" title={`${selectedRepos.length}件のリポジトリでフィルター適用中`}>
              🔍 フィルター適用中 ({selectedRepos.length}件)
            </span>
          )}
        </div>
        {timeseries && timeseries.length > 0 ? (
          <TimeseriesChart data={timeseries} />
        ) : (
          <div className="no-data-message">
            <p>時系列データがありません</p>
            <p className="no-data-hint">指定期間に時系列データが存在しない可能性があります</p>
          </div>
        )}
      </div>

      <div className="rankings-grid">
        {memberRanking && memberRanking.length > 0 ? (
          <div className={`ranking-section ${selectedRepos.length > 0 ? 'filtered' : ''}`}>
            <div className="section-header">
              <h2>メンバーランキング ({rankingType})</h2>
              {selectedRepos.length > 0 && (
                <span className="filter-indicator" title={`${selectedRepos.length}件のリポジトリでフィルター適用中`}>
                  🔍 フィルター適用中
                </span>
              )}
            </div>
            <RankingTable data={memberRanking} type="member" />
          </div>
        ) : (
          <div className="ranking-section">
            <h2>メンバーランキング ({rankingType})</h2>
            <p className="no-data">データがありません</p>
          </div>
        )}

        {repoRanking && repoRanking.length > 0 ? (
          <div className={`ranking-section ${selectedRepos.length > 0 ? 'filtered' : ''}`}>
            <div className="section-header">
              <h2>リポジトリランキング ({rankingType})</h2>
              {selectedRepos.length > 0 && (
                <span className="filter-indicator" title={`${selectedRepos.length}件のリポジトリでフィルター適用中`}>
                  🔍 フィルター適用中
                </span>
              )}
            </div>
            <RankingTable data={repoRanking} type="repo" />
          </div>
        ) : (
          <div className="ranking-section">
            <h2>リポジトリランキング ({rankingType})</h2>
            <p className="no-data">データがありません</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard

