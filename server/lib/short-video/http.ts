import type { ShortVideoPlatform } from './types'
import { createShortVideoError } from './types'
import { readLimitedText, safeFetch } from '~~/server/utils/safe-fetch'

const DEFAULT_TIMEOUT_MS = 15_000
const DEFAULT_MAX_RESPONSE_BYTES = 8 * 1024 * 1024

export const DESKTOP_BROWSER_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
export const MOBILE_BROWSER_USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'

export interface PlatformTextResponse {
  text: string
  url: URL
  status: number
  headers: Headers
}

function httpsUrl(input: string | URL): URL {
  const url = input instanceof URL ? new URL(input) : new URL(input)
  if (url.protocol === 'http:') url.protocol = 'https:'
  return url
}

function retryAfterSeconds(value: string | null): number | undefined {
  const seconds = Number(value)
  if (!Number.isFinite(seconds) || seconds <= 0) return undefined
  return Math.min(Math.ceil(seconds), 3_600)
}

function throwForStatus(platform: ShortVideoPlatform, response: Response): void {
  if (response.status === 429 || response.status === 503) {
    throw createShortVideoError(
      'business',
      503,
      'UPSTREAM_BUSY',
      `${platform} 平台服务繁忙，请稍后重试`,
      retryAfterSeconds(response.headers.get('retry-after'))
    )
  }
  if (response.status === 404) {
    throw createShortVideoError('business', 422, 'PARSE_FAILED', '分享内容不存在或已经失效')
  }
  if (!response.ok) {
    throw createShortVideoError('business', 502, 'UPSTREAM_ERROR', `${platform} 平台请求失败`)
  }
}

async function platformFetch(
  platform: ShortVideoPlatform,
  input: string | URL,
  allowedHosts: readonly string[],
  options: RequestInit
): Promise<Response> {
  try {
    return await safeFetch(httpsUrl(input), {
      ...options,
      allowedHosts,
      signal: options.signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT_MS)
    })
  } catch (error) {
    console.warn('[short-video] platform request failed', {
      platform,
      hostname: httpsUrl(input).hostname,
      error: error instanceof Error ? error.message : String(error)
    })
    throw createShortVideoError('business', 502, 'UPSTREAM_ERROR', `${platform} 平台请求失败`)
  }
}

export async function requestPlatformText(
  platform: ShortVideoPlatform,
  input: string | URL,
  allowedHosts: readonly string[],
  options: RequestInit = {},
  maxBytes = DEFAULT_MAX_RESPONSE_BYTES
): Promise<PlatformTextResponse> {
  const response = await platformFetch(platform, input, allowedHosts, options)
  throwForStatus(platform, response)

  try {
    return {
      text: await readLimitedText(response, maxBytes),
      url: new URL(response.url),
      status: response.status,
      headers: response.headers
    }
  } catch (error) {
    console.warn('[short-video] failed to read platform response', {
      platform,
      hostname: new URL(response.url).hostname,
      error: error instanceof Error ? error.message : String(error)
    })
    throw createShortVideoError(
      'business',
      502,
      'UPSTREAM_INVALID_RESPONSE',
      `${platform} 平台返回了无效数据`
    )
  }
}

export async function requestPlatformJson<T = unknown>(
  platform: ShortVideoPlatform,
  input: string | URL,
  allowedHosts: readonly string[],
  options: RequestInit = {}
): Promise<T> {
  const response = await requestPlatformText(platform, input, allowedHosts, options, 4 * 1024 * 1024)
  try {
    return JSON.parse(response.text) as T
  } catch {
    throw createShortVideoError(
      'business',
      502,
      'UPSTREAM_INVALID_RESPONSE',
      `${platform} 平台返回了无效 JSON`
    )
  }
}

export async function resolvePlatformUrl(
  platform: ShortVideoPlatform,
  input: URL,
  allowedHosts: readonly string[],
  headers: HeadersInit = {},
  signal?: AbortSignal
): Promise<URL> {
  const response = await platformFetch(platform, input, allowedHosts, {
    headers,
    method: 'GET',
    signal
  })
  throwForStatus(platform, response)
  const resolvedUrl = new URL(response.url)
  await response.body?.cancel().catch(() => undefined)
  return resolvedUrl
}
