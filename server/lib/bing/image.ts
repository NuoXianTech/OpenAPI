import {
  BING_ARCHIVE_URL,
  BING_BASE_URL,
  BING_CHROME_USER_AGENT,
  BING_CN_EDGE_IP,
  BING_PRIMARY_URL,
  type BingArchiveImage,
  type BingArchiveResponse,
  type BingImageRecord,
  type BingImageType,
  type BingPrimaryModel
} from './types'
import { waitForAbort } from '~~/server/utils/shared-cache'

interface BingCacheEntry {
  dayKey: string
  data: BingImageRecord
}

let bingCache: BingCacheEntry | null = null
let pendingBingFetch: Promise<BingImageRecord> | null = null

function formatLocalDateTime(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  const second = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}

function formatLocalDayKey(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function extractBingImageId(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl, BING_BASE_URL)
    const id = url.searchParams.get('id')
    if (!id) return null
    return id.replace(/_(?:\d+x\d+|UHD)\.jpg$/i, '')
  } catch {
    return null
  }
}

export function createBingImageUrl(rawUrl: string, size: '1920x1080' | '768x1366' | 'UHD' = '1920x1080'): string {
  const id = extractBingImageId(rawUrl)
  if (id) return `${BING_BASE_URL}/th?id=${id}_${size}.jpg`

  try {
    return new URL(rawUrl, BING_BASE_URL).toString()
  } catch {
    return rawUrl
  }
}

export function resolveBingCoverUrl(rawUrl: string, type: BingImageType, userAgent = ''): string {
  const shouldUseMobile = type === 'mobile' || (type === 'auto' && isMobileUserAgent(userAgent))
  return createBingImageUrl(rawUrl, shouldUseMobile ? '768x1366' : '1920x1080')
}

export function createBingMarkdown(record: BingImageRecord): string {
  const lines = [`# ${record.title || '必应每日壁纸'}`]

  if (record.headline) {
    lines.push('', `## ${record.headline}`)
  }

  if (record.description) {
    lines.push('', record.description)
  }

  lines.push('', `![${record.title}](${record.cover})`)

  if (record.copyright) {
    lines.push('', `*${record.copyright}*`)
  }

  return lines.join('\n')
}

function isMobileUserAgent(userAgent: string): boolean {
  return /\b(mobile|android|iphone|ipod|ipad|blackberry|webos|opera mini|windows phone|iemobile|symbian)\b/i.test(userAgent)
}

function createBingFetchOptions(signal?: AbortSignal): RequestInit {
  return {
    headers: {
      'user-agent': BING_CHROME_USER_AGENT,
      'x-real-ip': BING_CN_EDGE_IP,
      'x-forwarded-for': BING_CN_EDGE_IP,
      'accept': 'application/json,text/html,text/plain,*/*'
    },
    signal: signal ?? AbortSignal.timeout(15_000)
  }
}

function toBingImageRecord(image: BingArchiveImage, fetchedAt = new Date()): BingImageRecord {
  const title = image.title?.trim() || 'Bing 每日图片'
  const copyright = image.copyright?.trim() || ''
  const cover = createBingImageUrl(image.url || '')

  return {
    title,
    headline: title,
    description: title,
    cover,
    cover_4k: createBingImageUrl(cover, 'UHD'),
    main_text: title,
    copyright,
    update_date: formatLocalDateTime(fetchedAt),
    update_date_at: fetchedAt.getTime()
  }
}

function toBingPrimaryRecord(model: BingPrimaryModel, fetchedAt = new Date()): BingImageRecord | null {
  const imageContent = model.MediaContents?.[0]?.ImageContent
  if (!imageContent) return null

  const wallpaper = imageContent.Image?.Wallpaper || imageContent.Image?.Url || ''
  const cover = wallpaper ? createBingImageUrl(new URL(wallpaper, BING_BASE_URL).toString()) : ''
  if (!cover) return null

  return {
    title: imageContent.Title || '',
    headline: imageContent.Headline || '',
    description: imageContent.Description || '',
    main_text: imageContent.QuickFact?.MainText || '',
    cover,
    cover_4k: createBingImageUrl(cover, 'UHD'),
    copyright: imageContent.Copyright || '',
    update_date: formatLocalDateTime(fetchedAt),
    update_date_at: fetchedAt.getTime()
  }
}

async function fetchBingImageFromPrimary(signal?: AbortSignal): Promise<BingImageRecord | null> {
  const response = await fetch(BING_PRIMARY_URL, createBingFetchOptions(signal))
  if (!response.ok) return null

  const html = await response.text()
  const rawJson = /var\s*_model\s*=\s*([^;]+);/.exec(html)?.[1]
  if (!rawJson) return null

  try {
    return toBingPrimaryRecord(JSON.parse(rawJson) as BingPrimaryModel)
  } catch {
    return null
  }
}

async function fetchBingImageFromArchive(signal?: AbortSignal): Promise<BingImageRecord> {
  const response = await fetch(BING_ARCHIVE_URL, createBingFetchOptions(signal))

  if (!response.ok) {
    throw new Error(`Bing archive responded with HTTP ${response.status}`)
  }

  const body = await response.json() as BingArchiveResponse
  const image = body.images?.[0]
  if (!image?.url) {
    throw new Error('Bing archive response does not contain an image url')
  }

  return toBingImageRecord(image)
}

async function fetchBingImage(signal?: AbortSignal): Promise<BingImageRecord> {
  const primaryRecord = await fetchBingImageFromPrimary(signal).catch(() => null)
  return primaryRecord || fetchBingImageFromArchive(signal)
}

export async function getBingImage(signal?: AbortSignal): Promise<BingImageRecord> {
  const dayKey = formatLocalDayKey()
  if (bingCache?.dayKey === dayKey) return waitForAbort(Promise.resolve(bingCache.data), signal)
  if (pendingBingFetch) return waitForAbort(pendingBingFetch, signal)

  // Keep the daily producer independent from an individual request timeout.
  pendingBingFetch = fetchBingImage()
    .then((record) => {
      bingCache = {
        dayKey,
        data: record
      }
      return record
    })
    .catch((error: unknown) => {
      if (bingCache) return bingCache.data
      throw error
    })
    .finally(() => {
      pendingBingFetch = null
    })

  return waitForAbort(pendingBingFetch, signal)
}
