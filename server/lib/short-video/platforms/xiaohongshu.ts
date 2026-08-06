/** Adapted from dist/api/short_videos (MIT, Copyright 2025 jiuhunwl). */

import { createShortVideoError } from '../types'
import {
  asArray,
  asRecord,
  collectMediaUrls,
  firstMediaUrl,
  firstText,
  isRecord,
  parseJsonRecord
} from '../values'
import {
  DESKTOP_BROWSER_USER_AGENT,
  MOBILE_BROWSER_USER_AGENT,
  requestPlatformText,
  resolvePlatformUrl
} from '../http'

const PLATFORM = 'xiaohongshu'
const ALLOWED_HOSTS = ['xiaohongshu.com', 'xhslink.com', 'xhs.com'] as const

export function extractXiaohongshuId(url: URL): string | null {
  return /\/(?:discovery\/item|explore|item|note)\/([0-9A-Za-z]+)/i.exec(url.pathname)?.[1] ?? null
}

export function extractXiaohongshuNoteFromHtml(
  html: string,
  noteId: string
): Record<string, unknown> | null {
  const rawState = /window\.__INITIAL_STATE__\s*=\s*([\s\S]*?)<\/script>/i.exec(html)?.[1]
  if (!rawState) return null
  const state = parseJsonRecord(rawState.trim().replace(/;$/, '').replace(/\bundefined\b/g, 'null'))
  if (!state) return null

  const note = asRecord(asRecord(asRecord(asRecord(state.note).noteDetailMap)[noteId]).note)
  if (Object.keys(note).length > 0) return note

  for (const value of Object.values(asRecord(asRecord(state.note).noteDetailMap))) {
    const candidate = asRecord(asRecord(value).note)
    if (Object.keys(candidate).length > 0) return candidate
  }

  const fallback = asRecord(asRecord(asRecord(state.noteData).data).noteData)
  return Object.keys(fallback).length > 0 ? fallback : null
}

export function normalizeXiaohongshuImageUrl(value: unknown): string {
  const url = firstMediaUrl(value)
  if (!url) return ''

  let match = /\/oss-sg\/([0-9A-Za-z_]+)\/([0-9A-Za-z]+)!/.exec(url)
  if (match?.[1] && match[2] && !/^[a-f0-9]{32}$/.test(match[1]) && !/^\d+$/.test(match[1])) {
    return `https://sns-img-hw.xhscdn.com/oss-sg/${match[1]}/${match[2]}?imageView2/2/w/0/format/jpg`
  }

  match = /\/([0-9A-Za-z_]+)\/([0-9A-Za-z]+)!/.exec(url)
  if (match?.[1] && match[2] && !/^[a-f0-9]{32}$/.test(match[1]) && !/^\d+$/.test(match[1])) {
    return `https://sns-img-hw.xhscdn.com/${match[1]}/${match[2]}?imageView2/2/w/0/format/jpg`
  }

  match = /(notes_pre_post|spectrum|notes_uhdr)\/([0-9A-Za-z]+)/.exec(url)
  if (match?.[1] && match[2]) {
    return `https://sns-img-hw.xhscdn.com/${match[1]}/${match[2]}?imageView2/2/w/0/format/jpg`
  }

  match = /\/([0-9A-Za-z]+)!/.exec(url)
  return match?.[1]
    ? `https://ci.xiaohongshu.com/${match[1]}?imageView2/2/w/0/format/jpg`
    : url
}

function videoStreams(note: Record<string, unknown>): Record<string, unknown>[] {
  const stream = asRecord(asRecord(asRecord(note.video).media).stream)
  const streams: Array<Record<string, unknown> & { codec: string }> = [
    ...asArray(stream.h265).filter(isRecord).map(value => ({ ...value, codec: 'h265' })),
    ...asArray(stream.h264).filter(isRecord).map(value => ({ ...value, codec: 'h264' }))
  ]
  return streams.sort((a, b) => {
    if (a.codec !== b.codec) return a.codec === 'h265' ? -1 : 1
    return Number(b.avgBitrate ?? b.videoBitrate ?? 0) - Number(a.avgBitrate ?? a.videoBitrate ?? 0)
  })
}

export function formatXiaohongshuNote(note: Record<string, unknown>): unknown {
  const rawType = firstText(note.type) || 'unknown'
  let type = rawType === 'normal' ? 'image' : rawType
  const imageList = asArray(note.imageList)
  const firstImage = asRecord(imageList[0])
  const video = asRecord(note.video)
  const thumbnailFileId = firstText(asRecord(video.image).thumbnailFileid)
  const cover = normalizeXiaohongshuImageUrl(
    firstMediaUrl(firstImage.urlPre, firstImage.urlDefault, firstImage.url)
    || (thumbnailFileId ? `https://sns-img-hw.xhscdn.com/${thumbnailFileId}` : '')
    || firstMediaUrl(asRecord(note.cover).url)
    || (firstText(asRecord(note.cover).fileId)
      ? `https://sns-img-hw.xhscdn.com/${firstText(asRecord(note.cover).fileId)}?imageView2/2/w/0/format/jpg`
      : '')
  )
  const streams = videoStreams(note)
  const mainVideo = firstMediaUrl(streams[0]?.masterUrl)
    || (firstText(asRecord(video.consumer).originVideoKey)
      ? `https://sns-video-bd.xhscdn.com/${firstText(asRecord(video.consumer).originVideoKey)}`
      : '')
  const backupVideos = streams.slice(1).flatMap(stream => collectMediaUrls(stream.masterUrl))
  const images: string[] = []
  const livePhotos: Array<{ image: string, video: string }> = []

  for (const value of imageList) {
    const image = asRecord(value)
    const imageUrl = normalizeXiaohongshuImageUrl(
      firstMediaUrl(image.url, image.urlDefault, image.urlPre)
    )
    if (imageUrl) images.push(imageUrl)

    const stream = asRecord(image.stream)
    const liveVideo = firstMediaUrl(
      asRecord(asArray(stream.h264)[0]).masterUrl,
      asRecord(asArray(stream.h265)[0]).masterUrl
    )
    if (imageUrl && liveVideo) livePhotos.push({ image: imageUrl, video: liveVideo })
  }
  if (livePhotos.length > 0) type = 'live'

  const user = asRecord(note.user)
  const interactInfo = asRecord(note.interactInfo)
  return {
    code: 200,
    msg: '解析成功',
    data: {
      type,
      title: firstText(note.title),
      desc: firstText(note.desc),
      author: {
        name: firstText(user.nickname, user.nickName),
        id: firstText(user.userId),
        avatar: firstMediaUrl(user.avatar)
      },
      like: interactInfo.likedCount ?? interactInfo.liked_count,
      time: note.time ?? note.createTime ?? note.create_time,
      cover,
      url: mainVideo,
      video_backup: backupVideos,
      images,
      live_photo: livePhotos,
      music: asRecord(note.music)
    }
  }
}

export async function parseXiaohongshu(sourceUrl: URL, signal?: AbortSignal): Promise<unknown> {
  const normalizedSource = new URL(sourceUrl)
  if (normalizedSource.hostname === 'xhs.com' || normalizedSource.hostname.endsWith('.xhs.com')) {
    normalizedSource.hostname = 'xhslink.com'
  }

  let resolvedUrl = normalizedSource
  let noteId = extractXiaohongshuId(resolvedUrl)
  if (!noteId) {
    resolvedUrl = await resolvePlatformUrl(PLATFORM, normalizedSource, ALLOWED_HOSTS, {
      'user-agent': MOBILE_BROWSER_USER_AGENT
    }, signal)
    noteId = extractXiaohongshuId(resolvedUrl)
  }
  if (!noteId) {
    throw createShortVideoError('business', 422, 'PARSE_FAILED', '无法从小红书链接提取笔记 ID')
  }

  const candidates = [resolvedUrl.toString()]
  const token = resolvedUrl.searchParams.get('xsec_token')
  if (token) {
    const fallbackUrl = new URL(`https://www.xiaohongshu.com/discovery/item/${noteId}`)
    fallbackUrl.search = new URLSearchParams({
      app_platform: 'android',
      ignoreEngage: 'true',
      app_version: '8.69.5',
      share_from_user_hidden: 'true',
      xsec_source: 'app_share',
      type: 'video',
      xsec_token: token
    }).toString()
    candidates.push(fallbackUrl.toString())
  }

  for (const candidate of candidates) {
    for (const userAgent of [DESKTOP_BROWSER_USER_AGENT, MOBILE_BROWSER_USER_AGENT]) {
      const response = await requestPlatformText(PLATFORM, candidate, ALLOWED_HOSTS, {
        headers: {
          'accept': 'text/html,application/xhtml+xml,*/*',
          'accept-language': 'zh-CN,zh;q=0.9',
          'referer': 'https://www.xiaohongshu.com/',
          'user-agent': userAgent
        },
        signal
      }).catch(() => null)
      if (!response) continue

      const note = extractXiaohongshuNoteFromHtml(response.text, noteId)
      if (note) return formatXiaohongshuNote(note)
    }
  }

  throw createShortVideoError('business', 422, 'PARSE_FAILED', '小红书笔记不存在、已失效或暂时无法解析')
}
