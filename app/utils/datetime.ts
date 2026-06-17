/**
 * 统一的本地时间格式化(zh-CN，24 小时制)。
 *
 * 全站日期展示的唯一入口：解析失败或空值返回 fallback(默认 '-')，
 * 取代各页面/组件里重复的 `new Date(x).toLocaleString('zh-CN', { hour12: false })`
 * + try/catch 或 NaN 判断样板。
 */
export function formatDateTime(
  value: string | number | Date | null | undefined,
  fallback = '-'
): string {
  if (value === null || value === undefined || value === '') return fallback
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime())
    ? fallback
    : date.toLocaleString('zh-CN', { hour12: false })
}

const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] as const

/** 解析趋势数据点的日期：优先按本地零点解析 YYYY-MM-DD（避免 UTC 偏移串天），否则交给 Date */
export function parseTrendDate(value: string): Date | null {
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
export function formatTrendFullDate(value: string): string {
  const date = parseTrendDate(value)
  if (!date) return value
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day} ${WEEKDAY_LABELS[date.getDay()]}`
}
