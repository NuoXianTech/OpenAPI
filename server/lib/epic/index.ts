import { getSharedCache } from '~~/server/utils/shared-cache'
import { readLimitedText, safeFetch } from '~~/server/utils/safe-fetch'

export const EPIC_ENCODINGS = ['json', 'text', 'markdown', 'md'] as const
export type EpicEncoding = typeof EPIC_ENCODINGS[number]

export interface EpicFreeGame {
  id: string
  title: string
  cover: string
  original_price: number
  original_price_desc: string
  description: string
  seller: string
  is_free_now: boolean
  free_start: string
  free_start_at: number
  free_end: string
  free_end_at: number
  link: string
}

interface UnknownRecord { [key: string]: unknown }

interface EpicPromotionWindow {
  startAt: number
  endAt: number
}

const EPIC_API_HOST = 'store-site-backend-static-ipv4.ak.epicgames.com'
const EPIC_API_URL = `https://${EPIC_API_HOST}/freeGamesPromotions?locale=zh-CN&country=CN&allowCountries=CN`
const EPIC_CACHE_TTL_SECONDS = 10 * 60
const EPIC_MAX_RESPONSE_BYTES = 2 * 1024 * 1024
const MAX_EPIC_GAMES = 50
const SHANGHAI_DATE_TIME_FORMATTER = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
})

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : ''
}

function normalizeText(value: unknown, fallback = ''): string {
  return readString(value).replace(/\s+/g, ' ').trim() || fallback
}

function readFiniteNumber(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null
  if (typeof value === 'string' && !value.trim()) return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function readPromotionWindows(value: unknown): EpicPromotionWindow[] {
  if (!isRecord(value)) return []

  const seen = new Set<string>()
  const windows = [value.promotionalOffers, value.upcomingPromotionalOffers].flatMap((rawGroups) => {
    if (!Array.isArray(rawGroups)) return []
    return rawGroups.flatMap((rawGroup) => {
      if (!isRecord(rawGroup) || !Array.isArray(rawGroup.promotionalOffers)) return []
      return rawGroup.promotionalOffers.flatMap((rawOffer) => {
        if (!isRecord(rawOffer) || !isRecord(rawOffer.discountSetting)) return []
        if (readFiniteNumber(rawOffer.discountSetting.discountPercentage) !== 0) return []

        const startAt = Date.parse(readString(rawOffer.startDate))
        const endAt = Date.parse(readString(rawOffer.endDate))
        if (!Number.isFinite(startAt) || !Number.isFinite(endAt) || endAt <= startAt) return []

        const identity = `${startAt}:${endAt}`
        if (seen.has(identity)) return []
        seen.add(identity)
        return [{ startAt, endAt }]
      })
    })
  })

  return windows.toSorted((a, b) => a.startAt - b.startAt)
}

function selectPromotionWindow(value: unknown, now: number): EpicPromotionWindow | null {
  const windows = readPromotionWindows(value)
  return windows.find(window => window.startAt <= now && now < window.endAt)
    || windows.find(window => window.startAt > now)
    || null
}

function readMappingSlug(value: unknown): string {
  if (!Array.isArray(value)) return ''
  for (const item of value) {
    if (!isRecord(item)) continue
    const slug = readString(item.pageSlug)
    if (slug) return slug
  }
  return ''
}

function createEpicGameLink(game: UnknownRecord): string {
  const catalogNs = isRecord(game.catalogNs) ? game.catalogNs : {}
  const slug = readString(game.productSlug)
    || readMappingSlug(catalogNs.mappings)
    || readMappingSlug(game.offerMappings)
    || readString(game.urlSlug)
  const segments = slug.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean)
  if (segments.length === 0) return ''
  return `https://store.epicgames.com/zh-CN/p/${segments.map(encodeURIComponent).join('/')}`
}

function normalizeHttpsUrl(value: unknown): string {
  const rawUrl = readString(value)
  if (!rawUrl) return ''

  try {
    const wrapper = new URL(rawUrl)
    const nestedCover = wrapper.searchParams.get('cover')
    const url = new URL(nestedCover || rawUrl)
    if ((url.protocol !== 'http:' && url.protocol !== 'https:') || url.username || url.password || url.port) return ''
    url.protocol = 'https:'
    return url.toString()
  } catch {
    return ''
  }
}

function readEpicCover(value: unknown): string {
  if (!Array.isArray(value)) return ''
  const images = value.filter(isRecord)
  const wideCover = images.find(image => readString(image.type) === 'OfferImageWide')
  for (const image of wideCover ? [wideCover, ...images] : images) {
    const cover = normalizeHttpsUrl(image.url)
    if (cover) return cover
  }
  return ''
}

function readOriginalPrice(game: UnknownRecord): { value: number, description: string } {
  const price = isRecord(game.price) ? game.price : {}
  const totalPrice = isRecord(price.totalPrice) ? price.totalPrice : {}
  const currencyInfo = isRecord(totalPrice.currencyInfo) ? totalPrice.currencyInfo : {}
  const formattedPrice = isRecord(totalPrice.fmtPrice) ? totalPrice.fmtPrice : {}
  const rawPrice = readFiniteNumber(totalPrice.originalPrice)
  const rawDecimals = readFiniteNumber(currencyInfo.decimals)
  const decimals = rawDecimals !== null && Number.isInteger(rawDecimals) && rawDecimals >= 0 && rawDecimals <= 4
    ? rawDecimals
    : 2

  return {
    value: rawPrice !== null && rawPrice >= 0 ? rawPrice / (10 ** decimals) : 0,
    description: readString(formattedPrice.originalPrice) || '暂无价格'
  }
}

function formatShanghaiDateTime(timestamp: number): string {
  return SHANGHAI_DATE_TIME_FORMATTER.format(timestamp).replaceAll('/', '-')
}

function normalizeEpicGame(value: unknown, now: number): EpicFreeGame | null {
  if (!isRecord(value)) return null
  const offerType = readString(value.offerType).toUpperCase()
  if (offerType !== 'BASE_GAME' && offerType !== 'OTHERS') return null

  const promotion = selectPromotionWindow(value.promotions, now)
  const title = normalizeText(value.title).replaceAll('Mystery Game', '神秘游戏')
  if (!promotion || !title) return null

  const originalPrice = readOriginalPrice(value)
  return {
    id: readString(value.id),
    title,
    cover: readEpicCover(value.keyImages),
    original_price: originalPrice.value,
    original_price_desc: originalPrice.description,
    description: normalizeText(value.description, '暂无描述').replaceAll('Mystery Game', '神秘游戏'),
    seller: normalizeText(isRecord(value.seller) ? value.seller.name : '', '未知发行商'),
    is_free_now: promotion.startAt <= now && now < promotion.endAt,
    free_start: formatShanghaiDateTime(promotion.startAt),
    free_start_at: promotion.startAt,
    free_end: formatShanghaiDateTime(promotion.endAt),
    free_end_at: promotion.endAt,
    link: createEpicGameLink(value)
  }
}

export function normalizeEpicResponse(payload: unknown, now = Date.now()): EpicFreeGame[] {
  const data = isRecord(payload) ? payload.data : null
  const catalog = isRecord(data) ? data.Catalog : null
  const searchStore = isRecord(catalog) ? catalog.searchStore : null
  const elements = isRecord(searchStore) ? searchStore.elements : null
  if (!Array.isArray(elements)) throw new Error('Epic 上游返回了无效游戏数据')

  return elements
    .flatMap((game) => {
      const normalized = normalizeEpicGame(game, now)
      return normalized ? [normalized] : []
    })
    .toSorted((a, b) => Number(b.is_free_now) - Number(a.is_free_now)
      || a.free_start_at - b.free_start_at
      || a.title.localeCompare(b.title, 'zh-CN'))
    .slice(0, MAX_EPIC_GAMES)
}

async function fetchEpicFreeGames(signal?: AbortSignal): Promise<EpicFreeGame[]> {
  let response: Response
  try {
    response = await safeFetch(EPIC_API_URL, {
      allowedHosts: [EPIC_API_HOST],
      headers: {
        'accept': 'application/json',
        'user-agent': 'Mozilla/5.0 Chrome/124 Safari/537.36'
      },
      signal: signal ?? AbortSignal.timeout(15_000)
    })
  } catch (error) {
    throw new Error('Epic 上游请求失败', { cause: error })
  }

  if (!response.ok) {
    await response.body?.cancel()
    throw new Error(`Epic 上游返回 HTTP ${response.status}`)
  }

  let payload: unknown
  try {
    payload = JSON.parse(await readLimitedText(response, EPIC_MAX_RESPONSE_BYTES)) as unknown
  } catch (error) {
    throw new Error('Epic 上游返回了无效 JSON 数据', { cause: error })
  }
  return normalizeEpicResponse(payload)
}

export async function getEpicFreeGames(signal?: AbortSignal): Promise<EpicFreeGame[]> {
  const games = await getSharedCache({
    key: 'cache:epic:free-games:cn',
    ttlSeconds: EPIC_CACHE_TTL_SECONDS,
    loader: () => fetchEpicFreeGames(signal)
  })
  const now = Date.now()
  return games
    .filter(game => game.free_end_at > now)
    .map(game => ({
      ...game,
      is_free_now: game.free_start_at <= now && now < game.free_end_at
    }))
    .toSorted((a, b) => Number(b.is_free_now) - Number(a.is_free_now)
      || a.free_start_at - b.free_start_at
      || a.title.localeCompare(b.title, 'zh-CN'))
}

export function isEpicEncoding(value: string): value is EpicEncoding {
  return EPIC_ENCODINGS.includes(value as EpicEncoding)
}

function formatEpicTitle(title: string): string {
  return title.includes('《') ? title : `《${title}》`
}

function formatShortDateTime(timestamp: number): string {
  return formatShanghaiDateTime(timestamp).slice(0, 16)
}

export function formatEpicText(games: EpicFreeGame[]): string {
  if (games.length === 0) return 'Epic Games 免费游戏\n\n暂无正在或即将免费的游戏'
  const items = games.slice(0, 20).map((game, index) => {
    const freeDescription = game.is_free_now
      ? `现在免费，截至 ${formatShortDateTime(game.free_end_at)}`
      : `${formatShortDateTime(game.free_start_at)} 至 ${formatShortDateTime(game.free_end_at)} 免费`
    return `${index + 1}. ${formatEpicTitle(game.title)}，${freeDescription}\n\n${game.description}`
  }).join('\n\n')
  return `Epic Games 免费游戏\n\n${items}`
}

function escapeMarkdownText(value: string): string {
  return value.replace(/([\\`*_[\]{}()#+\-.!|<>])/g, '\\$1')
}

export function formatEpicMarkdown(games: EpicFreeGame[]): string {
  if (games.length === 0) return '# Epic Games 免费游戏\n\n暂无正在或即将免费的游戏。'
  const items = games.slice(0, 20).map((game, index) => {
    const title = escapeMarkdownText(formatEpicTitle(game.title))
    const heading = game.link ? `[${title}](<${game.link}>)` : title
    const freeDescription = game.is_free_now
      ? `🎮 **现在免费**，截至 ${formatShortDateTime(game.free_end_at)}`
      : `⏰ ${formatShortDateTime(game.free_start_at)} 至 ${formatShortDateTime(game.free_end_at)} 免费`
    const cover = game.cover ? `![${escapeMarkdownText(game.title)}](<${game.cover}>)` : ''
    return [
      `## ${index + 1}. ${heading}${game.is_free_now ? ' 🔥' : ''}`,
      '',
      freeDescription,
      '',
      escapeMarkdownText(game.description),
      ...(cover ? ['', cover] : []),
      '',
      `**发行商**：${escapeMarkdownText(game.seller)} · **原价**：${escapeMarkdownText(game.original_price_desc)}`
    ].join('\n')
  }).join('\n\n---\n\n')
  return `# Epic Games 免费游戏\n\n${items}`
}
