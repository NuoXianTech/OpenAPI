import { CalendarDateTime } from '@internationalized/date'

/**
 * 统一的本地时间格式化(zh-CN，24 小时制)。
 *
 * 全站日期展示的唯一入口：解析失败或空值返回 fallback(默认 '-')，
 * 取代各页面/组件里重复的 `new Date(x).toLocaleString('zh-CN', { hour12: false })`
 * + try/catch 或 NaN 判断样板。
 */
export function formatDateTime(
  value: string | number | Date | null | undefined,
  fallback = '-',
  locale = 'zh-CN'
): string {
  if (value === null || value === undefined || value === '') return fallback
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime())
    ? fallback
    : date.toLocaleString(locale, { hour12: false })
}

/** 解析趋势数据点的日期：优先按本地零点解析 YYYY-MM-DD（避免 UTC 偏移串天），否则交给 Date */
function parseTrendDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** 轴标签用短日期 MM-DD（解析失败回退原值） */
export function formatTrendShortDate(value: string): string {
  const date = parseTrendDate(value)
  if (!date) return value
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${month}-${day}`
}

/** tooltip 用完整日期 "YYYY-MM-DD 周X"（解析失败回退原值） */
export function formatTrendFullDate(value: string, locale = 'zh-CN'): string {
  const date = parseTrendDate(value)
  if (!date) return value
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date)
  return `${date.getFullYear()}-${month}-${day} ${weekday}`
}

const pad2 = (value: number) => `${value}`.padStart(2, '0')

/**
 * 把 `<input type="datetime-local">` 的字符串 `YYYY-MM-DDTHH:mm`(可带秒)解析为
 * `CalendarDateTime`，供日历 / 时间选择器使用。空值或非法格式返回 undefined。
 */
export function dateTimeLocalToCalendar(value: string | null | undefined): CalendarDateTime | undefined {
  if (!value) return undefined
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(value)
  if (!match) return undefined
  return new CalendarDateTime(
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    match[6] ? Number(match[6]) : 0
  )
}

/**
 * 把 `CalendarDateTime` 序列化回 `YYYY-MM-DDTHH:mm`，与 datetime-local 字段同格式，
 * 让选择器对外保持纯字符串契约（消费方 `new Date(str)` 按本地时间解析）。
 */
export function calendarToDateTimeLocal(value: CalendarDateTime): string {
  return `${value.year}-${pad2(value.month)}-${pad2(value.day)}T${pad2(value.hour)}:${pad2(value.minute)}`
}
