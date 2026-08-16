/** Adapted from dist/api/short_videos (MIT, Copyright 2025 jiuhunwl). */

import { createShortVideoError } from '../types'
import { asRecord, firstMediaUrl, firstText } from '../values'
import {
  DESKTOP_BROWSER_USER_AGENT,
  requestPlatformJson,
  resolvePlatformUrl
} from '../http'

const PLATFORM = 'weibo'
const ALLOWED_HOSTS = ['weibo.com', 'weibo.cn', 't.cn'] as const

export function extractWeiboVideoId(url: URL): string | null {
  const fid = url.searchParams.get('fid')
  if (fid) return fid

  const pathId = /\/tv\/(?:show|v)\/([^/?#]+)/i.exec(url.pathname)?.[1]
  if (pathId) return decodeURIComponent(pathId)
  return /\d+:\d+/.exec(url.toString())?.[0] ?? null
}

function qualityPriority(label: string): number {
  const value = label.toUpperCase()
  if (value.includes('2K')) return 5
  if (value.includes('1080P')) return 4
  if (value.includes('720P')) return 3
  if (value.includes('480P')) return 2
  if (value.includes('360P')) return 1
  return 0
}

export async function parseWeibo(sourceUrl: URL, signal?: AbortSignal): Promise<unknown> {
  let videoId = extractWeiboVideoId(sourceUrl)
  if (!videoId) {
    const resolvedUrl = await resolvePlatformUrl(PLATFORM, sourceUrl, ALLOWED_HOSTS, {
      'user-agent': DESKTOP_BROWSER_USER_AGENT
    }, signal)
    videoId = extractWeiboVideoId(resolvedUrl)
  }
  if (!videoId) {
    throw createShortVideoError('business', 422, 'PARSE_FAILED', '无法从微博链接提取视频 ID')
  }

  const page = `/tv/show/${videoId}`
  const apiUrl = new URL('https://weibo.com/tv/api/component')
  apiUrl.searchParams.set('page', page)
  const body = new URLSearchParams({
    data: JSON.stringify({
      Component_Play_Playinfo: { oid: videoId }
    })
  })
  const payload = await requestPlatformJson<Record<string, unknown>>(
    PLATFORM,
    apiUrl,
    ALLOWED_HOSTS,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'origin': 'https://weibo.com',
        'referer': `https://weibo.com${page}`,
        'user-agent': DESKTOP_BROWSER_USER_AGENT
      },
      body,
      signal
    }
  )

  const components = asRecord(payload.data)
  const info = asRecord(components.Component_Play_Playinfo)
  if (Number(payload.code) !== 100000 || Object.keys(info).length === 0) {
    throw createShortVideoError('business', 422, 'PARSE_FAILED', '微博视频不存在或不可访问')
  }

  const variants = Object.entries(asRecord(info.urls))
    .map(([label, value]) => ({
      label,
      priority: qualityPriority(label),
      url: firstMediaUrl(value)
    }))
    .filter(item => item.url)
    .sort((a, b) => b.priority - a.priority)
  if (variants.length === 0) {
    throw createShortVideoError('business', 422, 'PARSE_FAILED', '微博视频未返回可用播放地址')
  }

  return {
    code: 200,
    msg: '解析成功',
    data: {
      type: 'video',
      title: firstText(info.title),
      desc: firstText(info.title),
      author: {
        name: firstText(info.author),
        id: firstText(info.author_id),
        avatar: firstMediaUrl(info.avatar)
      },
      like: info.attitudes_count,
      time: info.date,
      cover: firstMediaUrl(info.cover_image),
      url: variants[0]?.url,
      duration: Number(info.duration_time) || null,
      video_backup: variants.slice(1).map(item => ({ label: item.label, url: item.url }))
    }
  }
}
