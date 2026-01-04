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

