/**
 * App-local day helpers for daily API call aggregation.
 */

const APP_TIME_ZONE = 'Asia/Shanghai'
const APP_TIME_ZONE_OFFSET = '+08:00'
const DAY_MS = 86_400 * 1_000

const ymdFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
})

function ymdInAppTimeZone(date: Date): { year: string, month: string, day: string } {
  const parts = ymdFormatter.formatToParts(date)
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === type)?.value || ''
  return { year: pick('year'), month: pick('month'), day: pick('day') }
}

export function getLocalDayStart(value: Date | string | number = new Date()): Date {
  const date = value instanceof Date ? value : new Date(value)
  const { year, month, day } = ymdInAppTimeZone(date)
  return new Date(`${year}-${month}-${day}T00:00:00${APP_TIME_ZONE_OFFSET}`)
}

export function addLocalDays(value: Date, days: number): Date {
  return new Date(value.getTime() + days * DAY_MS)
}

export function toLocalDateKey(value: Date | string | number): string {
  const date = value instanceof Date ? value : new Date(value)
  const { year, month, day } = ymdInAppTimeZone(date)
  return `${year}-${month}-${day}`
}
