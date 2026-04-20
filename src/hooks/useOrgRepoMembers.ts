import { useEffect, useState } from 'react'
import { apiClient } from '../api/client'
import { getDefaultStartByDays, getToday } from '../utils/format'

interface Result {
  repos: string[]
  members: string[]
}

export function useOrgRepoMembers(org: string, daysAgo = 180): Result {
  const [repos, setRepos] = useState<string[]>([])
  const [members, setMembers] = useState<string[]>([])

  useEffect(() => {
    if (!org) return
    let cancelled = false
    ;(async () => {
      try {
        const [repoRes, memberRes] = await Promise.all([
          apiClient.getRepoRanking(org, 'commits', {
            start: getDefaultStartByDays(daysAgo),
            end: getToday(),
            limit: 1000,
          }),
          apiClient.getMemberRanking(org, 'commits', {
            start: getDefaultStartByDays(daysAgo),
            end: getToday(),
            limit: 1000,
          }),
        ])
        if (cancelled) return
        const repoData = (repoRes as any).data || repoRes
        const memberData = (memberRes as any).data || memberRes
        if (Array.isArray(repoData)) {
          setRepos([
            ...new Set(
              repoData
                .map((r: any) => r.Repo || r.repo || '')
                .filter((r: string) => r !== '')
            ),
          ])
        }
        if (Array.isArray(memberData)) {
          setMembers([
            ...new Set(
              memberData
                .map((m: any) => m.Member || m.member || '')
                .filter((m: string) => m !== '')
            ),
          ])
        }
      } catch (err) {
        console.error('Error fetching repo/member list:', err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [org, daysAgo])

  return { repos, members }
}
