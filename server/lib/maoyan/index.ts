import { getSharedCache } from '~~/server/utils/shared-cache'
import { fetchBoxOfficeByType } from './realtime'

const MAOYAN_ENCODINGS = ['json', 'text', 'markdown', 'md'] as const
export const MAOYAN_REALTIME_TYPES = ['movie', 'tv', 'web'] as const

export type MaoyanEncoding = typeof MAOYAN_ENCODINGS[number]
export type MaoyanRealtimeType = typeof MAOYAN_REALTIME_TYPES[number]
export type MaoyanRealtimeData = Awaited<ReturnType<typeof fetchBoxOfficeByType>>

interface MaoyanGlobalMovieItem {
  rank: number
  maoyan_id: number
  movie_name: string
  release_year: string
  box_office: number
  box_office_desc: string
}

export interface MaoyanGlobalData {
  list: MaoyanGlobalMovieItem[]
  tip: string
  update_time: string
  update_time_at: number
}

interface RawGlobalMovieItem {
  movieId: number
  movieName: string
  rawValue: number
  releaseTime: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readGlobalMovieItems(value: unknown): RawGlobalMovieItem[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!isRecord(item)) return []
    const movieId = Number(item.movieId)
    const rawValue = Number(item.rawValue)
    if (!Number.isFinite(movieId) || !Number.isFinite(rawValue)) return []
    return [{
      movieId,
      movieName: String(item.movieName || ''),
      rawValue,
      releaseTime: String(item.releaseTime || '')
    }]
  })
}

function formatShanghaiDateTime(timestamp = Date.now()): string {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).format(timestamp).replaceAll('/', '-')
}

export function formatBoxOffice(boxOffice: number | string, decimals = 2): string {
  if (!Number.isInteger(decimals) || decimals < 0) throw new Error('decimals 必须是非负整数')
  const amount = Number(boxOffice)
  if (!Number.isFinite(amount)) throw new Error('票房必须是有效数字')
  function formatNumber(value: number): string { return value.toFixed(decimals).replace(/\.?0+$/, '') }
  if (amount < 10 ** 4) return `${formatNumber(amount)}元`
  if (amount < 10 ** 8) return `${formatNumber(amount / 10 ** 4)}万元`
  if (amount < 10 ** 12) return `${formatNumber(amount / 10 ** 8)}亿元`
  return `${formatNumber(amount / 10 ** 12)}万亿元`
}

async function fetchGlobalBoxOffice(): Promise<MaoyanGlobalData> {
  const response = await fetch('https://piaofang.maoyan.com/i/globalBox/historyRank', {
    headers: {
      'referer': 'https://piaofang.maoyan.com/',
      'user-agent': 'Mozilla/5.0 Chrome/133.0.0.0 Safari/537.36'
    },
    signal: AbortSignal.timeout(15_000)
  })
  if (!response.ok) throw new Error(`猫眼上游返回 HTTP ${response.status}`)
  const html = await response.text()
  const serializedProps = /var props = (\{.*?\});/.exec(html)?.[1]
  if (!serializedProps) throw new Error('猫眼全球票房页面结构已变化')
  const payload = JSON.parse(serializedProps) as unknown
  const data = isRecord(payload) && isRecord(payload.data) ? payload.data : {}
  const detail = isRecord(data.detail) ? data.detail : {}
  const list = readGlobalMovieItems(detail.list)
  if (list.length === 0) throw new Error('猫眼上游未返回全球票房数据')
  const now = Date.now()
  return {
    list: list.toSorted((a, b) => b.rawValue - a.rawValue).map((item, index) => ({
      rank: index + 1,
      maoyan_id: item.movieId,
      movie_name: item.movieName,
      release_year: item.releaseTime,
      box_office: item.rawValue,
      box_office_desc: formatBoxOffice(item.rawValue)
    })),
    tip: typeof detail.tips === 'string' ? detail.tips : '',
    update_time: formatShanghaiDateTime(now),
    update_time_at: now
  }
}

export function isMaoyanEncoding(value: string): value is MaoyanEncoding {
  return MAOYAN_ENCODINGS.includes(value as MaoyanEncoding)
}

export function isMaoyanRealtimeType(value: string): value is MaoyanRealtimeType {
  return MAOYAN_REALTIME_TYPES.includes(value as MaoyanRealtimeType)
}

export function isValidMaoyanDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const year = Number(value.slice(0, 4))
  const month = Number(value.slice(5, 7))
  const day = Number(value.slice(8, 10))
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

export function getMaoyanGlobalBoxOffice(): Promise<MaoyanGlobalData> {
  return getSharedCache({ key: 'cache:maoyan:global:movie', ttlSeconds: 6 * 60 * 60, loader: fetchGlobalBoxOffice })
}

export function getMaoyanRealtime(type: MaoyanRealtimeType, date?: string): Promise<MaoyanRealtimeData> {
  return getSharedCache({
    key: `cache:maoyan:realtime:${type}:${date || 'today'}`,
    ttlSeconds: date ? 60 * 60 : 60,
    loader: () => fetchBoxOfficeByType(type, date)
  })
}
