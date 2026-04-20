export const getToday = (): string => new Date().toISOString().split('T')[0]

export const getDefaultStartByDays = (daysAgo: number): string => {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().split('T')[0]
}

export const getDefaultStartByMonths = (monthsAgo: number): string => {
  const d = new Date()
  d.setMonth(d.getMonth() - monthsAgo)
  return d.toISOString().split('T')[0]
}

export const addDays = (isoDate: string, days: number): string => {
  const d = new Date(isoDate)
  d.setDate(d.getDate() + days - 1)
  return d.toISOString().split('T')[0]
}

export const formatPeriod = (p: string, granularity: 'day' | 'week' | 'month'): string => {
  const d = new Date(p)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  if (granularity === 'month') return `${y}-${m}`
  return `${m}-${day}`
}

export const formatHours = (
  v: number | null | undefined,
  unit: 'ja' | 'short' = 'ja'
): string => {
  if (v === null || v === undefined) return '-'
  if (v < 1) return `${(v * 60).toFixed(0)}分`
  if (v < 24) return unit === 'ja' ? `${v.toFixed(1)}時間` : `${v.toFixed(1)}h`
  return `${(v / 24).toFixed(1)}日`
}

export const formatPct = (v: number | null | undefined, digits = 1): string =>
  v === null || v === undefined ? '-' : `${(v * 100).toFixed(digits)}%`
