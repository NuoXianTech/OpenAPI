import type {
  ShortVideoData,
  ShortVideoMediaType,
  ShortVideoPlatform
} from './types'
import { createShortVideoError } from './types'
import {
  asRecord,
  collectMediaUrls,
  firstMediaUrl,
  firstText,
  isRecord
} from './values'

const BUSY_MESSAGE_PATTERN = /(并发.{0,8}(已满|上限)|服务繁忙|busy|too many requests|rate.?limit)/iu

function normalizeMediaType(value: unknown): ShortVideoMediaType {
  const type = firstText(value).toLowerCase()
  if (type === 'video' || type === 'image' || type === 'live') return type
  return 'unknown'
}

function normalizeAuthor(data: Record<string, unknown>): Pick<ShortVideoData, 'author' | 'uid' | 'avatar'> {
  const authorValue = data.author ?? data.auther ?? data.user
  const author = isRecord(authorValue) ? authorValue : {}
  return {
    author: firstText(
      author.name,
      author.nickname,
      author.userName,
      isRecord(data.user) ? data.user.name : '',
      authorValue,
      data.auther
    ),
    uid: firstText(
      author.id,
      author.uid,
      author.userId,
      author.userID,
      data.uid,
      data.userId,
      data.userID
    ),
    avatar: firstMediaUrl(
      author.avatar,
      author.avatarUrl,
      author.user_img,
      author.headUrl,
      isRecord(data.user) ? data.user.avatar : '',
      isRecord(data.user) ? data.user.user_img : '',
      data.avatar
    )
  }
}

function normalizeCount(...values: unknown[]): number | null {
  for (const value of values) {
    if (value === '' || value === null || value === undefined) continue
    const count = Number(value)
    if (Number.isFinite(count) && count >= 0) return Math.trunc(count)
  }
  return null
}

function normalizeTimestamp(...values: unknown[]): number | null {
  for (const value of values) {
    if (value === '' || value === null || value === undefined) continue
    const timestamp = Number(value)
    if (Number.isFinite(timestamp) && timestamp > 0) {
      return Math.trunc(timestamp > 10_000_000_000 ? timestamp / 1_000 : timestamp)
    }

    if (typeof value === 'string') {
      const parsed = Date.parse(value)
      if (Number.isFinite(parsed) && parsed > 0) return Math.trunc(parsed / 1_000)
    }
  }
  return null
}

function normalizeMusic(data: Record<string, unknown>): ShortVideoData['music'] {
  const value = data.music
  if (typeof value === 'string') {
    const url = firstMediaUrl(value)
    return url ? { title: '', author: '', url, avatar: '' } : null
  }
  if (!isRecord(value)) return null

  const music = {
    title: firstText(value.title, value.name, value.musicName),
    author: firstText(value.author, value.artist, value.ownerNickname),
    url: firstMediaUrl(value.url, value.playUrl, value.play_url, value.uri),
    avatar: firstMediaUrl(value.avatar, value.cover, value.image)
  }
  return Object.values(music).some(Boolean) ? music : null
}

function normalizeLivePhotos(data: Record<string, unknown>): ShortVideoData['livePhotos'] {
  const values = data.live_photo ?? data.livePhoto
  if (!Array.isArray(values)) return []

  const seen = new Set<string>()
  return values.flatMap((value) => {
    if (!isRecord(value)) return []
    const image = firstMediaUrl(value.image, value.img, value.cover)
    const video = firstMediaUrl(value.video, value.url, value.video_url)
    if (!image || !video) return []

    const identity = `${image}\n${video}`
    if (seen.has(identity)) return []
    seen.add(identity)
    return [{ image, video }]
  })
}

function hasMedia(data: ShortVideoData): boolean {
  return Boolean(data.url) || data.images.length > 0 || data.livePhotos.length > 0
}

export function normalizeShortVideoPayload(
  payload: unknown,
  platform: ShortVideoPlatform
): ShortVideoData {
  if (!isRecord(payload)) {
    throw createShortVideoError(
      'business',
      502,
      'UPSTREAM_INVALID_RESPONSE',
      `${platform} 平台返回了无效数据`
    )
  }

  const message = firstText(payload.msg, payload.message)
  const code = payload.code === undefined || payload.code === null ? null : Number(payload.code)
  if (code === 429 || code === 503 || BUSY_MESSAGE_PATTERN.test(message)) {
    const retryAfterValue = asRecord(payload.data).retry_after ?? payload.retry_after
    const retryAfter = Number(retryAfterValue)
    throw createShortVideoError(
      'business',
      503,
      'UPSTREAM_BUSY',
      `${platform} 平台服务繁忙，请稍后重试`,
      Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(Math.ceil(retryAfter), 3_600) : undefined
    )
  }

  const rawData = isRecord(payload.data) ? payload.data : {}
  const declaredType = normalizeMediaType(rawData.type ?? rawData.videoType)
  const livePhotos = normalizeLivePhotos(rawData)
  const imageUrls = collectMediaUrls(rawData.images, rawData.imgurl, rawData.image)
  if (declaredType === 'image') imageUrls.push(...collectMediaUrls(rawData.url))
  const images = [...new Set([...imageUrls, ...livePhotos.map(item => item.image)])]

  let mediaUrl = declaredType === 'image' || declaredType === 'live'
    ? ''
    : firstMediaUrl(rawData.url, rawData.video, rawData.video_url, rawData.videoUrl, rawData.play_url)
  if (!mediaUrl && declaredType !== 'image' && declaredType !== 'live') {
    mediaUrl = collectMediaUrls(rawData.video_backup, rawData.videoBackup)[0] || ''
  }

  const type: ShortVideoMediaType = livePhotos.length > 0
    ? 'live'
    : mediaUrl
      ? 'video'
      : images.length > 0
        ? 'image'
        : declaredType

  const author = normalizeAuthor(rawData)
  const result: ShortVideoData = {
    platform,
    type,
    ...author,
    like: normalizeCount(rawData.like, rawData.likeCount, rawData.diggCount, rawData.attitudesCount),
    time: normalizeTimestamp(
      rawData.time,
      rawData.timestamp,
      rawData.createTime,
      rawData.create_time,
      rawData.pubdate,
      rawData.publishTime
    ),
    title: firstText(rawData.title, rawData.desc, rawData.description),
    cover: firstMediaUrl(rawData.cover, rawData.cover_url, rawData.coverUrl),
    url: mediaUrl,
    images,
    livePhotos,
    music: normalizeMusic(rawData)
  }

  const isSuccessfulCode = code === null || code === 200 || (code === 0 && hasMedia(result))
  if (!isSuccessfulCode || !hasMedia(result)) {
    throw createShortVideoError(
      'business',
      422,
      'PARSE_FAILED',
      '短视频解析失败，请确认分享链接仍然有效'
    )
  }

  return result
}
