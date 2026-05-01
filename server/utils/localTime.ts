/**
 * 本地时间（服务器时区）工具：所有按"日"聚合的统计逻辑统一使用本服务器时区，
 * 不再硬编码 UTC+8。部署到不同时区的机器，按机器时区分组即可。
 *
 * 关键约束：写入与读取必须使用同一函数，否则 statDate 唯一索引会被拆成两行。
 */

/** 取本地时区当日 00:00:00.000 的时刻 */
export function getLocalDayStart(value: Date | string | number = new Date()): Date {
  const date = value instanceof Date ? new Date(value) : new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

/** 在本地时区基础上加减若干天，跨夏令时也安全（依赖 setDate 自身的本地语义） */
export function addLocalDays(value: Date, days: number): Date {
  const next = new Date(value)
  next.setDate(next.getDate() + days)
  return next
}

/** 把任意时间点格式化为本地时区 YYYY-MM-DD，用作 trend / topN 的 group key */
export function toLocalDateKey(value: Date | string | number): string {
  const date = value instanceof Date ? value : new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
