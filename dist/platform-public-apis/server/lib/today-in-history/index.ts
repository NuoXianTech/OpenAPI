import { load } from 'cheerio'
import { getSharedCache } from '~~/server/utils/shared-cache'
import { readLimitedText, safeFetch } from '~~/server/utils/safe-fetch'

export const TODAY_IN_HISTORY_ENCODINGS = ['json', 'text', 'markdown', 'md'] as const
export type TodayInHistoryEncoding = typeof TODAY_IN_HISTORY_ENCODINGS[number]

export interface TodayInHistoryDate {
  date: string
  month: number
  day: number
  dayKey: string
}

export interface TodayInHistoryEvent {
  title: string
  year: string
  description: string
  event_type: 'birth' | 'death' | 'event'
  link: string
}

export interface TodayInHistoryData {
  date: string
  month: number
  day: number
  items: TodayInHistoryEvent[]
  total: number
}

interface UnknownRecord { [key: string]: unknown }

type HistoryMonthData = Record<string, TodayInHistoryEvent[]>

const HISTORY_API_HOST = 'baike.baidu.com'
const HISTORY_CACHE_TTL_SECONDS = 24 * 60 * 60
const HISTORY_MAX_RESPONSE_BYTES = 4 * 1024 * 1024
const MAX_EVENTS_PER_DAY = 100
const EVENT_TYPE_LABELS: Record<TodayInHistoryEvent['event_type'], string> = {
  birth: '出生',
  death: '逝世',
  event: '事件'
}
const SHANGHAI_MONTH_DAY_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai',
  month: '2-digit',
  day: '2-digit'
})

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : ''
}

function normalizeHtmlText(value: unknown): string {
  const text = readString(value)
  return text ? load(text, null, false).text().replace(/\s+/g, ' ').trim() : ''
}

function normalizeHistoryLink(value: unknown): string {
  const rawLink = readString(value)
  if (!rawLink) return ''
  try {
    const url = new URL(rawLink, `https://${HISTORY_API_HOST}`)
    if (
      url.hostname !== HISTORY_API_HOST
      || (url.protocol !== 'http:' && url.protocol !== 'https:')
      || url.username
      || url.password
      || url.port
    ) return ''
    url.protocol = 'https:'
    return url.toString()
  } catch {
    return ''
  }
}

function normalizeEventType(value: unknown): TodayInHistoryEvent['event_type'] {
  return value === 'birth' || value === 'death' ? value : 'event'
}

function normalizeHistoryEvent(value: unknown): TodayInHistoryEvent | null {
  if (!isRecord(value)) return null
  const title = normalizeHtmlText(value.title)
  const year = readString(value.year)
  if (!title || !year) return null
  return {
    title,
    year,
    description: normalizeHtmlText(value.desc),
    event_type: normalizeEventType(value.type),
    link: normalizeHistoryLink(value.link)
  }
}

function compareHistoryEvents(a: TodayInHistoryEvent, b: TodayInHistoryEvent): number {
  const aYear = Number(a.year)
  const bYear = Number(b.year)
  if (Number.isFinite(aYear) && Number.isFinite(bYear) && aYear !== bYear) return aYear - bYear
  if (Number.isFinite(aYear) !== Number.isFinite(bYear)) return Number.isFinite(aYear) ? -1 : 1
  return a.title.localeCompare(b.title, 'zh-CN')
}

function isValidHistoryDayKey(dayKey: string, month: number): boolean {
  if (!/^\d{4}$/.test(dayKey) || !dayKey.startsWith(String(month).padStart(2, '0'))) return false
  return isValidCalendarDate(2000, month, Number(dayKey.slice(2)))
}

export function normalizeHistoryMonthResponse(payload: unknown, month: number): HistoryMonthData {
  const monthKey = String(month).padStart(2, '0')
  const monthPayload = isRecord(payload) && isRecord(payload[monthKey]) ? payload[monthKey] : null
  if (!monthPayload) throw new Error('历史事件上游返回了无效月份数据')

  const result: HistoryMonthData = {}
  let normalizedEventCount = 0
  for (const [dayKey, rawEvents] of Object.entries(monthPayload)) {
    if (!isValidHistoryDayKey(dayKey, month) || !Array.isArray(rawEvents)) continue
    const seen = new Set<string>()
    const events = rawEvents.flatMap((rawEvent) => {
      const event = normalizeHistoryEvent(rawEvent)
      if (!event) return []
      const identity = `${event.year}\u0000${event.title}`
      if (seen.has(identity)) return []
      seen.add(identity)
      return [event]
    }).sort(compareHistoryEvents).slice(0, MAX_EVENTS_PER_DAY)
    result[dayKey] = events
    normalizedEventCount += events.length
  }

  if (Object.keys(result).length === 0 || normalizedEventCount === 0) {
    throw new Error('历史事件上游未返回可用事件')
  }
  return result
}

function readShanghaiMonthDay(now: number | Date): { month: number, day: number } {
  const parts = SHANGHAI_MONTH_DAY_FORMATTER.formatToParts(now instanceof Date ? now : new Date(now))
  const month = Number(parts.find(part => part.type === 'month')?.value)
  const day = Number(parts.find(part => part.type === 'day')?.value)
  return { month, day }
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  const date = new Date(0)
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCFullYear(year, month - 1, day)
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

export function parseTodayInHistoryDate(value: string, now: number | Date = Date.now()): TodayInHistoryDate | null {
  const normalized = value.trim()
  let month: number
  let day: number

  if (!normalized) {
    ({ month, day } = readShanghaiMonthDay(now))
  } else {
    const match = /^(?:(\d{4})-)?(\d{1,2})-(\d{1,2})$/.exec(normalized)
    if (!match) return null
    const year = match[1] ? Number(match[1]) : 2000
    month = Number(match[2])
    day = Number(match[3])
    if (!Number.isInteger(year) || year < 1 || year > 9999 || !isValidCalendarDate(year, month, day)) return null
  }

  const monthKey = String(month).padStart(2, '0')
  const dayText = String(day).padStart(2, '0')
  return {
    date: `${monthKey}-${dayText}`,
    month,
    day,
    dayKey: `${monthKey}${dayText}`
  }
}

async function fetchHistoryMonth(month: number, signal?: AbortSignal): Promise<HistoryMonthData> {
  const monthKey = String(month).padStart(2, '0')
  let response: Response
  try {
    response = await safeFetch(`https://${HISTORY_API_HOST}/cms/home/eventsOnHistory/${monthKey}.json`, {
      allowedHosts: [HISTORY_API_HOST],
      headers: {
        'accept': 'application/json',
        'user-agent': 'Mozilla/5.0 Chrome/124 Safari/537.36'
      },
      signal: signal ?? AbortSignal.timeout(10_000)
    })
  } catch (error) {
    throw new Error('历史事件上游请求失败', { cause: error })
  }

  if (!response.ok) throw new Error(`历史事件上游返回 HTTP ${response.status}`)

  let payload: unknown
  try {
    payload = JSON.parse(await readLimitedText(response, HISTORY_MAX_RESPONSE_BYTES)) as unknown
  } catch (error) {
    throw new Error('历史事件上游返回了无效 JSON 数据', { cause: error })
  }
  return normalizeHistoryMonthResponse(payload, month)
}

export async function getTodayInHistory(date: TodayInHistoryDate, signal?: AbortSignal): Promise<TodayInHistoryData> {
  const monthKey = String(date.month).padStart(2, '0')
  const monthData = await getSharedCache({
    key: `cache:today-in-history:month:${monthKey}`,
    ttlSeconds: HISTORY_CACHE_TTL_SECONDS,
    loader: () => fetchHistoryMonth(date.month, signal)
  })
  const items = (monthData[date.dayKey] || []).map(item => ({ ...item }))
  return {
    date: date.date,
    month: date.month,
    day: date.day,
    items,
    total: items.length
  }
}

export function isTodayInHistoryEncoding(value: string): value is TodayInHistoryEncoding {
  return TODAY_IN_HISTORY_ENCODINGS.includes(value as TodayInHistoryEncoding)
}

function formatHistoryYear(year: string): string {
  if (!/^-?\d+$/.test(year)) return `${year} 年`
  const numericYear = Number(year)
  return numericYear < 0 ? `公元前 ${Math.abs(numericYear)} 年` : `公元 ${numericYear} 年`
}

export function formatTodayInHistoryText(data: TodayInHistoryData): string {
  const items = data.items.length > 0
    ? data.items.map((item, index) => `${index + 1}. ${formatHistoryYear(item.year)} · ${EVENT_TYPE_LABELS[item.event_type]}：${item.title}`).join('\n')
    : '暂无历史事件记录'
  return `历史上的今天（${data.date}）\n\n${items}`
}

function escapeMarkdownText(value: string): string {
  return value.replace(/([\\`*_[\]{}()#+\-.!|<>])/g, '\\$1')
}

export function formatTodayInHistoryMarkdown(data: TodayInHistoryData): string {
  if (data.items.length === 0) return `# 历史上的今天（${data.date}）\n\n暂无历史事件记录。`
  const items = data.items.map((item, index) => {
    const title = escapeMarkdownText(item.title)
    const heading = item.link ? `[${title}](<${item.link}>)` : title
    return [
      `## ${index + 1}. ${heading}`,
      '',
      `- 年份：${escapeMarkdownText(formatHistoryYear(item.year))}`,
      `- 类型：${EVENT_TYPE_LABELS[item.event_type]}`,
      ...(item.description ? ['', escapeMarkdownText(item.description)] : [])
    ].join('\n')
  }).join('\n\n---\n\n')
  return `# 历史上的今天（${data.date}）\n\n${items}`
}
