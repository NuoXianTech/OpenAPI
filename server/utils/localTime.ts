/**
 * 本地时间（应用配置时区）工具：所有按"日"聚合的统计逻辑统一使用 APP_TIME_ZONE，
 * 不再依赖进程 TZ 环境变量。这样多实例部署在 UTC 容器和 +08:00 本地 dev 上结果一致。
 *
 * 关键约束：写入与读取必须使用同一函数，否则 statDate 唯一索引会被拆成两行。
 *
 * 时区固定为 Asia/Shanghai（自 1991 年起无 DST，可安全用 +08:00 字面量构造时刻，
 * 也可安全用 ±86400_000 ms 跨日）。如未来需要按 siteSettings 动态切换，
 * 需要换成 Temporal 或 luxon，并改成 async 接口。
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
  // en-CA 输出 YYYY-MM-DD 顺序，formatToParts 拿到分量后直接复用 padding
  const parts = ymdFormatter.formatToParts(date)
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === type)?.value || ''
  return { year: pick('year'), month: pick('month'), day: pick('day') }
}

/** 取应用时区当日 00:00:00.000 的时刻 */
export function getLocalDayStart(value: Date | string | number = new Date()): Date {
  const date = value instanceof Date ? value : new Date(value)
  const { year, month, day } = ymdInAppTimeZone(date)
  return new Date(`${year}-${month}-${day}T00:00:00${APP_TIME_ZONE_OFFSET}`)
}

/** 在应用时区基础上加减若干天；依赖 Asia/Shanghai 无 DST */
export function addLocalDays(value: Date, days: number): Date {
  return new Date(value.getTime() + days * DAY_MS)
}

/** 把任意时间点格式化为应用时区 YYYY-MM-DD，用作 trend / topN 的 group key */
export function toLocalDateKey(value: Date | string | number): string {
  const date = value instanceof Date ? value : new Date(value)
  const { year, month, day } = ymdInAppTimeZone(date)
  return `${year}-${month}-${day}`
}
