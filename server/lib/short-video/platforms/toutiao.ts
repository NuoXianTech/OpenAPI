/** Adapted from dist/api/short_videos (MIT, Copyright 2025 jiuhunwl). */

import { Buffer } from 'node:buffer'
import { createShortVideoError } from '../types'
import {
  asArray,
  asRecord,
  decodeUriComponent,
  firstMediaUrl,
  firstText,
  parseJsonRecord
} from '../values'
import { DESKTOP_BROWSER_USER_AGENT, requestPlatformText, resolvePlatformUrl } from '../http'

const PLATFORM = 'toutiao'
const ALLOWED_HOSTS = ['toutiao.com', 'ixigua.com'] as const

export function extractToutiaoVideoId(url: URL): string | null {
  const namedId = /\/(?:video|group)\/(\d+)/i.exec(url.pathname)?.[1]
  if (namedId) return namedId
  return url.pathname.split('/').findLast(part => /^\d{10,}$/.test(part)) ?? null
}

export function extractToutiaoRenderData(html: string): Record<string, unknown> | null {
  const encoded = /<script[^>]+id=["']RENDER_DATA["'][^>]*>([\s\S]*?)<\/script>/i.exec(html)?.[1]
  return encoded ? parseJsonRecord(decodeUriComponent(encoded.trim())) : null
}

function decodeVideoUrl(value: unknown): string {
  const direct = firstMediaUrl(value)
  if (direct || typeof value !== 'string') return direct
  try {
    return firstMediaUrl(Buffer.from(value, 'base64').toString('utf8'))
  } catch {
    return ''
  }
}

export async function parseToutiao(sourceUrl: URL): Promise<unknown> {
  let videoId = extractToutiaoVideoId(sourceUrl)
  if (!videoId) {
    const resolvedUrl = await resolvePlatformUrl(PLATFORM, sourceUrl, ALLOWED_HOSTS, {
      'user-agent': DESKTOP_BROWSER_USER_AGENT
    })
    videoId = extractToutiaoVideoId(resolvedUrl)
  }
  if (!videoId) {
    throw createShortVideoError('business', 422, 'PARSE_FAILED', '无法从头条链接提取视频 ID')
  }

  const pageUrl = `https://www.toutiao.com/video/${videoId}`
  const response = await requestPlatformText(PLATFORM, pageUrl, ALLOWED_HOSTS, {
    headers: {
      'accept': 'text/html,application/xhtml+xml,*/*',
      'referer': 'https://www.toutiao.com/',
      'user-agent': DESKTOP_BROWSER_USER_AGENT
    }
  })
  const renderData = extractToutiaoRenderData(response.text)
  const data = asRecord(renderData?.data)
  const initialVideo = asRecord(data.initialVideo)
  const itemCell = asRecord(initialVideo.itemCell)
  const statistics = asRecord(itemCell.itemCounter ?? itemCell.statistics)
  const userInfo = asRecord(itemCell.userInfo)
  const playInfo = asRecord(initialVideo.videoPlayInfo)
  const videoListValue = playInfo.video_list
  const videoList = Array.isArray(videoListValue)
    ? videoListValue
    : Object.values(asRecord(videoListValue))
  const variants = asArray(videoList)
    .map(value => asRecord(value))
    .map(value => ({
      score: Number(value.bitrate) || (Number(value.vwidth) * Number(value.vheight)) || 0,
      url: decodeVideoUrl(value.main_url ?? value.mainUrl)
    }))
    .filter(item => item.url)
    .sort((a, b) => b.score - a.score)
  if (!firstText(data.itemId) || variants.length === 0) {
    throw createShortVideoError('business', 422, 'PARSE_FAILED', '头条视频不存在或已经失效')
  }

  return {
    code: 200,
    msg: '解析成功',
    data: {
      type: 'video',
      itemId: firstText(data.itemId),
      author: {
        name: firstText(userInfo.name),
        id: firstText(userInfo.userID),
        avatar: firstMediaUrl(userInfo.avatarURL)
      },
      like: statistics.diggCount ?? statistics.digg_count ?? itemCell.diggCount,
      time: initialVideo.publishTime ?? itemCell.publishTime ?? data.publishTime,
      description: firstText(userInfo.description),
      title: firstText(initialVideo.title),
      cover: firstMediaUrl(initialVideo.coverUrl),
      url: variants[0]?.url,
      video_backup: variants.slice(1).map(item => item.url),
      music: asRecord(asRecord(itemCell.videoAbility).music)
    }
  }
}
