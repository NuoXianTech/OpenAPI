import { isHostnameWithin } from '~~/server/utils/safe-fetch'
import { parseBilibili } from './platforms/bilibili'
import { parseDouyin } from './platforms/douyin'
import { parseKuaishou } from './platforms/kuaishou'
import { parsePipigx } from './platforms/pipigx'
import { parsePipixia } from './platforms/pipixia'
import { parseToutiao } from './platforms/toutiao'
import { parseWeibo } from './platforms/weibo'
import { parseXiaohongshu } from './platforms/xiaohongshu'
import { normalizeShortVideoPayload } from './normalize'
import { createShortVideoError, type ShortVideoData, type ShortVideoPlatform } from './types'

const MAX_INPUT_LENGTH = 4_096
const SHARE_URL_PATTERN = /https?:\/\/[^\s<>"'`，。！？；：、（）【】《》「」『』]+/iu
const TRAILING_SHARE_PUNCTUATION = /[),.;!?，。！？；：、）】》」』]+$/u

const PLATFORM_HOSTS: Record<ShortVideoPlatform, readonly string[]> = {
  douyin: ['douyin.com', 'iesdouyin.com'],
  kuaishou: ['kuaishou.com', 'gifshow.com'],
  xiaohongshu: ['xiaohongshu.com', 'xhslink.com', 'xhs.com'],
  bilibili: ['bilibili.com', 'b23.tv'],
  weibo: ['weibo.com', 'weibo.cn', 't.cn'],
  pipixia: ['pipix.com', 'pipixia.com'],
  pipigx: ['ippzone.com', 'pipigx.com'],
  toutiao: ['toutiao.com', 'ixigua.com']
}

export { normalizeShortVideoPayload } from './normalize'

export function parseShortVideoUrl(input: string): URL {
  const text = input.trim()
  if (!text) {
    throw createShortVideoError('input', 400, 'MISSING_PARAMETER', '缺少参数 url')
  }
  if (text.length > MAX_INPUT_LENGTH) {
    throw createShortVideoError('input', 400, 'INVALID_PARAMETER', `url 不能超过 ${MAX_INPUT_LENGTH} 个字符`)
  }

  const candidate = text.match(SHARE_URL_PATTERN)?.[0]?.replace(TRAILING_SHARE_PUNCTUATION, '')
  if (!candidate) {
    throw createShortVideoError('input', 400, 'INVALID_PARAMETER', 'url 必须包含合法的 HTTP 或 HTTPS 链接')
  }

  try {
    const url = new URL(candidate)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port) {
      throw new Error('unsafe URL')
    }
    return url
  } catch {
    throw createShortVideoError('input', 400, 'INVALID_PARAMETER', 'url 必须包含合法的 HTTP 或 HTTPS 链接')
  }
}

export function detectShortVideoPlatform(url: URL): ShortVideoPlatform {
  for (const [platform, hosts] of Object.entries(PLATFORM_HOSTS) as Array<[
    ShortVideoPlatform,
    readonly string[]
  ]>) {
    if (hosts.some(host => isHostnameWithin(url.hostname, host))) return platform
  }

  throw createShortVideoError('input', 422, 'UNSUPPORTED_PLATFORM', '暂不支持该短视频平台')
}

export async function parseShortVideo(sourceUrl: URL, platform: ShortVideoPlatform, signal?: AbortSignal): Promise<ShortVideoData> {
  let payload: unknown
  switch (platform) {
    case 'douyin':
      payload = await parseDouyin(sourceUrl, signal)
      break
    case 'kuaishou':
      payload = await parseKuaishou(sourceUrl, signal)
      break
    case 'xiaohongshu':
      payload = await parseXiaohongshu(sourceUrl, signal)
      break
    case 'bilibili':
      payload = await parseBilibili(sourceUrl, signal)
      break
    case 'weibo':
      payload = await parseWeibo(sourceUrl, signal)
      break
    case 'pipixia':
      payload = await parsePipixia(sourceUrl, signal)
      break
    case 'pipigx':
      payload = await parsePipigx(sourceUrl, signal)
      break
    case 'toutiao':
      payload = await parseToutiao(sourceUrl, signal)
      break
  }
  return normalizeShortVideoPayload(payload, platform)
}
