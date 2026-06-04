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
