/** Adapted from dist/api/short_videos (MIT, Copyright 2025 jiuhunwl). */

import { createShortVideoError } from '../types'
import { asArray, asRecord, firstMediaUrl, firstText } from '../values'
import {
  DESKTOP_BROWSER_USER_AGENT,
  requestPlatformJson,
  resolvePlatformUrl
} from '../http'

const PLATFORM = 'bilibili'
const ALLOWED_HOSTS = ['bilibili.com', 'b23.tv'] as const
const REQUEST_HEADERS = {
  'accept': 'application/json,text/plain,*/*',
  'referer': 'https://www.bilibili.com/',
  'user-agent': DESKTOP_BROWSER_USER_AGENT
}

export function extractBilibiliId(url: URL): string | null {
  const queryId = url.searchParams.get('bvid')
  if (queryId && /^BV[0-9A-Za-z]+$/.test(queryId)) return queryId
  return /\/video\/(BV[0-9A-Za-z]+)/i.exec(url.pathname)?.[1] ?? null
}

async function resolveBilibiliVideo(sourceUrl: URL): Promise<{ bvid: string, url: URL }> {
  const directId = extractBilibiliId(sourceUrl)
  if (directId) return { bvid: directId, url: sourceUrl }

  const resolvedUrl = await resolvePlatformUrl(PLATFORM, sourceUrl, ALLOWED_HOSTS, {
    'user-agent': DESKTOP_BROWSER_USER_AGENT
  })
  const resolvedId = extractBilibiliId(resolvedUrl)
  if (!resolvedId) {
    throw createShortVideoError('business', 422, 'PARSE_FAILED', '无法从 Bilibili 链接提取 BV 号')
  }
  return { bvid: resolvedId, url: resolvedUrl }
}

async function parsePageVideo(bvid: string, page: Record<string, unknown>): Promise<string> {
  const cid = firstText(page.cid)
  if (!cid) return ''

  const url = new URL('https://api.bilibili.com/x/player/playurl')
  url.search = new URLSearchParams({
    otype: 'json',
    fnver: '0',
    fnval: '3',
    player: '3',
    qn: '112',
    bvid,
    cid,
    platform: 'html5',
    high_quality: '1'
  }).toString()

  const payload = await requestPlatformJson<Record<string, unknown>>(
    PLATFORM,
    url,
    ALLOWED_HOSTS,
    { headers: REQUEST_HEADERS }
  ).catch(() => null)
  const data = asRecord(payload?.data)
  const durl = asRecord(asArray(data.durl)[0])
  return firstMediaUrl(durl.url)
}

export async function parseBilibili(sourceUrl: URL): Promise<unknown> {
  const resolved = await resolveBilibiliVideo(sourceUrl)
  const { bvid } = resolved
  const viewUrl = new URL('https://api.bilibili.com/x/web-interface/view')
  viewUrl.searchParams.set('bvid', bvid)
  const payload = await requestPlatformJson<Record<string, unknown>>(
    PLATFORM,
    viewUrl,
    ALLOWED_HOSTS,
    { headers: REQUEST_HEADERS }
  )

  if (Number(payload.code) !== 0) {
    throw createShortVideoError('business', 422, 'PARSE_FAILED', 'Bilibili 视频不存在或不可访问')
  }

  const data = asRecord(payload.data)
  const owner = asRecord(data.owner)
  const statistics = asRecord(data.stat)
  const pages = asArray(data.pages).filter((value): value is Record<string, unknown> => (
    value !== null && typeof value === 'object' && !Array.isArray(value)
  ))
  const requestedPage = Math.max(Math.trunc(Number(resolved.url.searchParams.get('p')) || 1) - 1, 0)
  const page = pages[requestedPage] ?? pages[0]
  const videoUrl = page ? await parsePageVideo(bvid, page) : ''
  if (!videoUrl) {
    throw createShortVideoError('business', 422, 'PARSE_FAILED', 'Bilibili 视频未返回可用播放地址')
  }

  return {
    code: 200,
    msg: '解析成功',
    data: {
      type: 'video',
      title: firstText(data.title),
      description: firstText(data.desc),
      cover: firstMediaUrl(data.pic),
      author: {
        name: firstText(owner.name),
        id: firstText(owner.mid),
        avatar: firstMediaUrl(owner.face)
      },
      like: statistics.like,
      time: data.pubdate,
      url: videoUrl
    }
  }
}
