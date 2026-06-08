/**
 * App-local day helpers for daily API call aggregation.
 *
 * 时区由 process.env.TZ 决定（部署环境设置 TZ 即可）：下列函数全部走 Node 的本地
 * Date 方法，自动按进程时区计算，无需手算偏移、也无需逐处传时区。
 * APP_TIME_ZONE 取进程的有效时区，供 SQL `... at time zone ${APP_TIME_ZONE}`
 * 与 JS 端保持同一时区。
 */

export const APP_TIME_ZONE = process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone

export function getLocalDayStart(value: Date | string | number = new Date()): Date {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

export function addLocalDays(value: Date, days: number): Date {
  const date = new Date(value.getTime())
  date.setDate(date.getDate() + days)
  return date
}

export function toLocalDateKey(value: Date | string | number): string {
  const date = value instanceof Date ? value : new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
