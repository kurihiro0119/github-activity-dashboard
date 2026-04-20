export interface ApiResponse<T> {
  data: T
}

export interface OrgMetrics {
  org: string
  total_repos: number
  total_members: number
  commits: number
  prs: number
  additions: number
  deletions: number
  deploys: number
}

export interface TimeseriesData {
  date?: string
  period?: string
  commits: number
  prs: number
  additions?: number
  deletions?: number
  deploys: number
}

export interface RankingItem {
  rank: number
  member?: string
  repo?: string
  value: number
  commits: number
  prs: number
  additions?: number
  deletions?: number
  deploys: number
}

export type RankingType = 'commits' | 'prs' | 'code-changes' | 'deploys'

export interface ApiParams {
  start?: string
  end?: string
  granularity?: 'day' | 'week' | 'month'
  type?: RankingType
  limit?: number
  repo?: string | string[]
}

export type ActivityType = 'commit' | 'pull_request' | 'deploy' | 'release_case'

export interface ActivityReleaseCaseData {
  feature_branch: string
  sha: string
  first_commit_at: string
  total_commits: number
  ai_commits: number
  is_ai: boolean
  lead_time_hours: number
}

export interface ActivityCommitData {
  sha: string
  message: string
  additions: number
  deletions: number
  files_changed: number
}

export interface ActivityPrData {
  number: number
  state: 'open' | 'closed' | 'merged'
  title: string
  merged_at?: string
}

export interface ActivityDeployData {
  environment: string
  status: string
  workflow_run_id: string
}

export interface ActivityItem {
  id: string
  type: ActivityType
  timestamp: string
  repo: string
  branch?: string
  data: ActivityCommitData | ActivityPrData | ActivityDeployData | ActivityReleaseCaseData
}

export interface ActivitySummary {
  total: number
  commits: number
  pull_requests: number
  deploys: number
  additions: number
  deletions: number
}

export interface MemberActivitiesResponse {
  org: string
  member: string
  time_range: {
    start: string
    end: string
  }
  data: {
    summary: ActivitySummary
    activities: ActivityItem[]
    next_cursor: string
    has_next: boolean
  }
}

export interface ActivitiesParams {
  start?: string
  end?: string
  type?: string
  limit?: number
  cursor?: string
}

export type DoraGranularity = 'day' | 'week' | 'month'
export type DoraBenchmark = 'elite' | 'high' | 'medium' | 'low' | 'insufficient_data'
export type DoraScopeType = 'org' | 'repo' | 'member'

export interface DoraScope {
  type: DoraScopeType
  repo: string | null
  member: string | null
}

export interface DoraTimeRange {
  start: string
  end: string
}

export interface DoraFilters {
  repos?: string[]
  environment: string
  granularity: DoraGranularity
}

export interface DFTimeseriesPoint {
  period: string
  value: number
}

export interface DeploymentFrequency {
  definition: string
  total: number
  per_day: number
  per_week: number
  benchmark: DoraBenchmark
  timeseries: DFTimeseriesPoint[]
}

export interface LTTimeseriesPoint {
  period: string
  median: number | null
  sample_size: number
}

export interface LeadTimeHours {
  definition: string
  sample_size: number
  median: number | null
  avg: number | null
  p90: number | null
  p95: number | null
  benchmark: DoraBenchmark
  timeseries: LTTimeseriesPoint[]
  unmatched_prs: number
}

export interface CFRTimeseriesPoint {
  period: string
  total: number
  failed: number
  rate: number | null
}

export interface ChangeFailureRate {
  definition: string
  total_deploys: number
  failed_deploys: number
  rate: number | null
  percent: number | null
  benchmark: DoraBenchmark
  timeseries: CFRTimeseriesPoint[]
}

export interface RecoveryTimeHours {
  definition: string
  sample_size: number
  median: number | null
  avg: number | null
  p90: number | null
  benchmark: DoraBenchmark
  timeseries: LTTimeseriesPoint[]
  unresolved_failures: number
}

export interface DoraResponse {
  org: string
  scope: DoraScope
  time_range: DoraTimeRange
  filters: DoraFilters
  data: {
    deployment_frequency: DeploymentFrequency
    lead_time_hours: LeadTimeHours
    change_failure_rate: ChangeFailureRate
    recovery_time_hours: RecoveryTimeHours
  }
}

export interface DoraParams {
  start?: string
  end?: string
  repo?: string | string[]
  environment?: string
  granularity?: DoraGranularity
}

export type AiUsageGranularity = 'day' | 'week' | 'month'
export type AiUsageScopeType = 'org' | 'member'

export interface AiUsageSummary {
  total_commits: number
  ai_commits: number
  ai_rate: number
}

export interface AiUsageByType {
  type: string
  count: number
}

export interface AiUsageByBranch {
  branch: string
  total: number
  ai: number
  rate: number
}

export interface AiUsageByMember {
  member: string
  total: number
  ai: number
  rate: number
}

export interface AiUsageStatsBucket {
  commits: number
  avg_additions: number
  avg_deletions: number
  avg_files_changed: number
}

export interface AiUsageStats {
  normal: AiUsageStatsBucket
  ai: AiUsageStatsBucket
}

export interface AiUsageTimeseriesPoint {
  period: string
  total: number
  ai: number
  rate: number
}

export interface AiUsageResponse {
  org: string
  scope: { type: AiUsageScopeType; member?: string }
  time_range: { start: string; end: string }
  summary: AiUsageSummary
  by_type: AiUsageByType[]
  by_branch: AiUsageByBranch[]
  by_member?: AiUsageByMember[]
  stats: AiUsageStats
  timeseries: AiUsageTimeseriesPoint[]
}

export interface AiUsageParams {
  start?: string
  end?: string
  repo?: string | string[]
  granularity?: AiUsageGranularity
}

export type ReleaseCasesGranularity = 'day' | 'week' | 'month'

export interface LeadTimeStats {
  sample_size: number
  median: number | null
  avg: number | null
  p90: number | null
  p95: number | null
}

export interface ReleaseCasesSummary {
  total_cases: number
  ai_cases: number
  ai_rate: number
  lead_time: LeadTimeStats
}

export interface ReleaseCasesByRepo {
  repo: string
  total: number
  ai: number
  rate: number
  lead_time: LeadTimeStats
}

export interface ReleaseCasesByMember {
  member: string
  total: number
  ai: number
  rate: number
  lead_time: LeadTimeStats
}

export interface ReleaseCasesByBranch {
  branch: string
  total: number
  ai: number
  rate: number
}

export interface ReleaseCasesTimeseriesPoint {
  period: string
  total: number
  ai: number
  rate: number
  lead_time_median: number | null
  sample_size: number
}

export interface ReleaseCasesResponse {
  org: string
  time_range: { start: string; end: string }
  filters: {
    repos?: string[]
    member: string
    granularity: ReleaseCasesGranularity
  }
  summary: ReleaseCasesSummary
  by_repo?: ReleaseCasesByRepo[]
  by_member: ReleaseCasesByMember[]
  by_branch: ReleaseCasesByBranch[]
  timeseries: ReleaseCasesTimeseriesPoint[]
}

export interface ReleaseCasesParams {
  start?: string
  end?: string
  repo?: string | string[]
  member?: string
  granularity?: ReleaseCasesGranularity
}

