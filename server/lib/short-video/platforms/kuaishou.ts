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
import { DESKTOP_BROWSER_USER_AGENT, requestPlatformText } from '../http'

const PLATFORM = 'kuaishou'
const ALLOWED_HOSTS = ['kuaishou.com', 'gifshow.com'] as const

export function extractKuaishouContent(url: URL): { type: string, id: string } | null {
  for (const type of ['short-video', 'long-video', 'photo']) {
    const id = new RegExp(`/${type}/([^/?#]+)`, 'i').exec(url.pathname)?.[1]
    if (id) return { type, id }
  }
  return null
}

function parseInitState(html: string): Record<string, unknown> | null {
  const raw = /window\.INIT_STATE\s*=\s*([\s\S]*?)<\/script>/i.exec(html)?.[1]
  if (!raw) return null
  const json = raw.trim().replace(/;$/, '')
  return parseJsonRecord(json)
    ?? parseJsonRecord(json
      .replace('"{\\"err_msg\\":\\"launchApplication:fail\\"}"', '"launchApplication:fail"')
      .replace('"{\\"err_msg\\":\\"system:access_denied\\"}"', '"system:access_denied"'))
}

function formatKuaishouPhoto(photo: Record<string, unknown>): unknown | null {
  const musicSource = asRecord(photo.music ?? photo.soundTrack)
  const music = Object.keys(musicSource).length > 0
    ? {
        name: firstText(musicSource.name),
        artist: firstText(musicSource.artist),
        cover: firstMediaUrl(
          asRecord(asArray(musicSource.imageUrls)[0]).url,
          asRecord(asArray(musicSource.avatarUrls)[0]).url
        ),
        url: firstMediaUrl(asRecord(asArray(musicSource.audioUrls)[0]).url)
      }
    : null
  const atlas = asRecord(asRecord(photo.ext_params).atlas)
  const commonData = {
    title: firstText(photo.caption),
    author: firstText(photo.userName),
    uid: firstText(photo.userId, photo.userEid, photo.user_id),
    avatar: firstMediaUrl(photo.headUrl),
    like: photo.likeCount,
    time: photo.timestamp
  }
  const atlasImages = asArray(atlas.list)
    .map(path => firstText(path))
    .filter(Boolean)
    .map(path => `https://tx2.a.yximgs.com/${path.replace(/^\/+/, '')}`)

  if (atlasImages.length > 0) {
    const musicPath = firstText(atlas.music)
    return {
      code: 200,
      msg: '解析成功',
      data: {
        ...commonData,
        type: 'image',
        images: atlasImages,
        music: musicPath ? `https://txmov2.a.kwimgs.com${musicPath}` : music
      }
    }
  }

  const cover = firstMediaUrl(asRecord(asArray(photo.coverUrls)[0]).url)
  if (photo.photoType === 'SINGLE_PICTURE' || photo.singlePicture === true) {
    if (!cover) return null
    return {
      code: 200,
      msg: '解析成功',
      data: {
        ...commonData,
        type: 'image',
        cover,
        images: [cover],
        music
      }
    }
  }

  const videoUrl = firstMediaUrl(
    asRecord(asArray(photo.mainMvUrls)[0]).url,
    asRecord(asArray(asRecord(asArray(asRecord(photo.manifest).adaptationSet)[0]).representation)[0]).url
  )
  if (!videoUrl) return null
  return {
    code: 200,
    msg: '解析成功',
    data: {
      ...commonData,
      type: 'video',
      cover,
      url: videoUrl,
      duration: Number(photo.duration) || null,
      music
    }
  }
}

function parseKuaishouInitState(html: string): unknown | null {
  const state = parseInitState(html)
  if (!state) return null
  for (const [key, value] of Object.entries(state)) {
    if (!key.startsWith('tusjoh') || !isRecord(value)) continue
    const photo = asRecord(value.photo)
    if (Object.keys(photo).length === 0) continue
    const result = formatKuaishouPhoto(photo)
    if (result) return result
  }
  return null
}

function parseKuaishouApolloState(
  html: string,
  content: { type: string, id: string }
): unknown | null {
  const raw = /window\.__APOLLO_STATE__\s*=\s*([\s\S]*?)<\/script>/i.exec(html)?.[1]
  if (!raw) return null
  const cleaned = raw
    .replace(/function\s*\([^)]*\)\s*{[^}]*}/g, 'null')
    .replace(/,\s*(?=}|])/g, '')
    .replace(/;\s*$/, '')
  const state = parseJsonRecord(cleaned)
  const client = asRecord(state?.defaultClient)
  const video = asRecord(client[`VisionVideoDetailPhoto:${content.id}`])
  if (Object.keys(video).length === 0) return null

  const author = Object.entries(client)
    .find(([key, value]) => key.startsWith('VisionVideoDetailAuthor:') && isRecord(value))?.[1]
  const authorData = asRecord(author)
  const longVideo = asRecord(asArray(asRecord(asRecord(video.manifestH265).json).adaptationSet)[0])
  const representation = asRecord(asArray(longVideo.representation)[0])
  const mediaUrl = content.type === 'long-video'
    ? collectMediaUrls(representation.backupUrl)[0]
    : firstMediaUrl(video.photoUrl)
  if (!mediaUrl) return null

  return {
    code: 200,
    msg: '解析成功',
    data: {
      type: content.type === 'photo' ? 'image' : 'video',
      title: firstText(video.caption),
      author: firstText(authorData.name),
      uid: firstText(authorData.id, authorData.userId, authorData.userEid),
      avatar: firstMediaUrl(authorData.headerUrl),
      like: video.likeCount,
      time: video.timestamp,
      cover: firstMediaUrl(video.coverUrl),
      url: mediaUrl
    }
  }
}

export function parseKuaishouPage(html: string, resolvedUrl: URL): unknown | null {
  const initState = parseKuaishouInitState(html)
  if (initState) return initState
  const content = extractKuaishouContent(resolvedUrl)
  return content ? parseKuaishouApolloState(html, content) : null
}

export async function parseKuaishou(sourceUrl: URL): Promise<unknown> {
  const response = await requestPlatformText(PLATFORM, sourceUrl, ALLOWED_HOSTS, {
    headers: {
      'accept': 'text/html,application/xhtml+xml,*/*',
      'accept-language': 'zh-CN,zh;q=0.9',
      'cache-control': 'no-cache',
      'user-agent': DESKTOP_BROWSER_USER_AGENT
    }
  })
  const result = parseKuaishouPage(response.text, response.url)
  if (!result) {
    throw createShortVideoError('business', 422, 'PARSE_FAILED', '快手内容不存在、已失效或暂时无法解析')
  }
  return result
}
