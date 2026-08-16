/** Adapted from dist/api/short_videos (MIT, Copyright 2025 jiuhunwl). */

import { createShortVideoError } from '../types'
import {
  asArray,
  asRecord,
  collectMediaUrls,
  decodeUriComponent,
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

const PLATFORM = 'douyin'
const ALLOWED_HOSTS = ['douyin.com', 'iesdouyin.com'] as const

export function extractDouyinId(url: URL): string | null {
  for (const key of ['modal_id', 'vid', 'id']) {
    const value = url.searchParams.get(key)
    if (value && /^\d+$/.test(value)) return value
  }
  return /\/(?:video|note)\/(\d+)/i.exec(url.pathname)?.[1]
    ?? /\/share\/(?:video|slides)\/(\d+)/i.exec(url.pathname)?.[1]
    ?? null
}

function findRouterDetail(routerData: Record<string, unknown>): Record<string, unknown> | null {
  for (const value of Object.values(asRecord(routerData.loaderData))) {
    const page = asRecord(value)
    const item = asRecord(asArray(asRecord(page.videoInfoRes).item_list)[0])
    if (Object.keys(item).length > 0) return item
  }
  return null
}

export function extractDouyinDetailFromHtml(html: string): Record<string, unknown> | null {
  const renderData = /<script[^>]+id=["']RENDER_DATA["'][^>]*>([\s\S]*?)<\/script>/i.exec(html)?.[1]
  if (renderData) {
    const state = parseJsonRecord(decodeUriComponent(renderData.trim()))
    const detail = asRecord(asRecord(state?.app).videoDetail)
    if (Object.keys(detail).length > 0) return detail
    const routerDetail = state ? findRouterDetail(state) : null
    if (routerDetail) return routerDetail
  }

  const routerData = /window\._ROUTER_DATA\s*=\s*([\s\S]*?)<\/script>/i.exec(html)?.[1]
  if (!routerData) return null
  const state = parseJsonRecord(routerData.trim().replace(/;$/, ''))
  return state ? findRouterDetail(state) : null
}

function replaceV26Host(url: string): string {
  return url.includes('v26-web')
    ? url.replace(/:\/\/([^/]+)/, '://v26-luna.douyinvod.com')
    : url
}

function collectRateCandidates(rate: Record<string, unknown>): string[] {
  const playAddr = rate.playAddr
  const camelCaseUrls = asArray(playAddr).flatMap(value => (
    isRecord(value) ? collectMediaUrls(value.src) : []
  ))
  return camelCaseUrls.length > 0
    ? camelCaseUrls
    : collectMediaUrls(asRecord(rate.play_addr).url_list)
}

function extractHighestQualityVideo(detail: Record<string, unknown>): { url: string, backups: string[] } {
  const video = asRecord(detail.video)
  const rates = asArray(video.bitRateList ?? video.bit_rate)
    .filter(isRecord)
    .sort((a, b) => Number(b.bitRate ?? b.bit_rate ?? 0) - Number(a.bitRate ?? a.bit_rate ?? 0))
  let mainUrl = ''
  const backups: string[] = []

  for (const rate of rates) {
    const candidates = collectRateCandidates(rate).map(replaceV26Host)
    const preferred = candidates.find(url => url.includes('v3-web'))
      ?? candidates.find(url => url.includes('v26-luna'))
      ?? candidates[0]
      ?? ''
    if (!mainUrl && preferred) mainUrl = preferred
    backups.push(...candidates.filter(url => url !== mainUrl))
    if (mainUrl && backups.length > 0) break
  }

  if (!mainUrl) {
    const playAddr = asRecord(video.play_addr)
    const playUrls = collectMediaUrls(video.playApi, playAddr.url_list)
      .map(url => url.replaceAll('playwm', 'play'))
    mainUrl = playUrls[0] ?? ''
    backups.push(...playUrls.slice(1))

    const videoId = firstText(video.uri, playAddr.uri)
    if (!mainUrl && videoId) {
      mainUrl = `https://aweme.snssdk.com/aweme/v1/play/?video_id=${encodeURIComponent(videoId)}&ratio=720p&line=0`
    }
  }

  return {
    url: mainUrl.replaceAll('playwm', 'play'),
    backups: [...new Set(backups.map(url => url.replaceAll('playwm', 'play')))]
  }
}

function extractLiveVideo(image: Record<string, unknown>): string {
  const video = asRecord(image.video)
  const candidates = [
    ...asArray(video.playAddr).flatMap(value => (
      isRecord(value) ? collectMediaUrls(value.src) : []
    )),
    ...collectMediaUrls(asRecord(video.play_addr).url_list),
    ...collectMediaUrls(video.playApi)
  ].map(replaceV26Host)
  return candidates.find(url => url.includes('v3-web'))
    ?? candidates.find(url => url.includes('v26-luna'))
    ?? candidates[1]
    ?? candidates[0]
    ?? ''
}

function pickDouyinCover(detail: Record<string, unknown>, images: unknown[]): string {
  const video = asRecord(detail.video)
  return firstMediaUrl(
    collectMediaUrls(asRecord(video.originCover).urlList)[0],
    collectMediaUrls(asRecord(video.origin_cover).url_list)[0],
    video.originCover,
    collectMediaUrls(video.originCoverUrlList)[0],
    collectMediaUrls(asRecord(video.cover).urlList, asRecord(video.cover).url_list)[0],
    video.cover,
    collectMediaUrls(asRecord(video.dynamicCover).urlList)[0],
    collectMediaUrls(asRecord(video.dynamic_cover).url_list)[0],
    collectMediaUrls(asRecord(images[0]).urlList, asRecord(images[0]).url_list)[0]
  )
}

export function formatDouyinDetail(detail: Record<string, unknown>, videoId: string): unknown {
  const authorInfo = asRecord(detail.authorInfo)
  const author = { ...asRecord(detail.author), ...authorInfo }
  const statistics = asRecord(detail.statistics)
  const video = asRecord(detail.video)
  const music = asRecord(detail.music)
  const images = asArray(detail.images ?? detail.image_list)
  const imageUrls: string[] = []
  const livePhotos: Array<{ image: string, video: string }> = []

  for (const value of images) {
    const image = asRecord(value)
    const imageUrl = collectMediaUrls(image.urlList, image.url_list)[0] ?? ''
    const liveVideo = extractLiveVideo(image)
    if (imageUrl) imageUrls.push(imageUrl)
    if (imageUrl && liveVideo) livePhotos.push({ image: imageUrl, video: liveVideo })
  }

  const parsedVideo = images.length === 0 ? extractHighestQualityVideo(detail) : { url: '', backups: [] }
  const musicPlay = asRecord(music.playUrl ?? music.play_url)
  const musicCover = asRecord(music.coverThumb ?? music.cover_thumb)
  return {
    code: 200,
    msg: '解析成功',
    data: {
      type: livePhotos.length > 0 ? 'live' : imageUrls.length > 0 ? 'image' : 'video',
      title: firstText(detail.desc),
      desc: firstText(detail.desc),
      author: {
        name: firstText(author.nickname),
        id: firstText(
          author.uniqueId,
          author.unique_id,
          author.secUid,
          author.sec_uid,
          author.uid,
          author.short_id
        ),
        avatar: firstMediaUrl(
          author.avatarUri,
          collectMediaUrls(asRecord(author.avatarThumb).urlList)[0],
          collectMediaUrls(asRecord(author.avatar_thumb).url_list)[0]
        )
      },
      like: statistics.diggCount ?? statistics.digg_count,
      time: detail.createTime ?? detail.create_time,
      cover: pickDouyinCover(detail, images),
      url: parsedVideo.url,
      duration: Number(video.duration) || null,
      video_backup: parsedVideo.backups,
      video_id: firstText(video.uri, asRecord(video.play_addr).uri, videoId),
      images: imageUrls,
      live_photo: livePhotos,
      music: {
        title: firstText(music.musicName, music.title),
        author: firstText(music.ownerNickname, music.author),
        url: firstMediaUrl(
          collectMediaUrls(musicPlay.urlList, musicPlay.url_list)[0],
          musicPlay.uri
        ),
        cover: firstMediaUrl(collectMediaUrls(musicCover.urlList, musicCover.url_list)[0])
      }
    }
  }
}

export async function parseDouyin(sourceUrl: URL, signal?: AbortSignal): Promise<unknown> {
  let resolvedUrl = sourceUrl
  let videoId = extractDouyinId(resolvedUrl)
  if (!videoId) {
    resolvedUrl = await resolvePlatformUrl(PLATFORM, sourceUrl, ALLOWED_HOSTS, {
      'user-agent': MOBILE_BROWSER_USER_AGENT
    }, signal)
    videoId = extractDouyinId(resolvedUrl)
  }
  if (!videoId) {
    throw createShortVideoError('business', 422, 'PARSE_FAILED', '无法从抖音链接提取内容 ID')
  }

  const candidates = [...new Set([
    resolvedUrl.toString(),
    `https://www.iesdouyin.com/share/video/${videoId}/`,
    `https://www.iesdouyin.com/share/slides/${videoId}/`,
    `https://www.douyin.com/user/self?modal_id=${videoId}&showTab=like`
  ])]
  for (const candidate of candidates) {
    const response = await requestPlatformText(PLATFORM, candidate, ALLOWED_HOSTS, {
      headers: {
        'accept': 'text/html,application/xhtml+xml,*/*',
        'accept-language': 'zh-CN,zh;q=0.9',
        'referer': resolvedUrl.toString(),
        'user-agent': candidate.includes('iesdouyin.com') ? MOBILE_BROWSER_USER_AGENT : DESKTOP_BROWSER_USER_AGENT
      },
      signal
    }).catch(() => null)
    if (!response) continue

    const detail = extractDouyinDetailFromHtml(response.text)
    if (detail) return formatDouyinDetail(detail, videoId)
  }

  throw createShortVideoError('business', 422, 'PARSE_FAILED', '抖音内容不存在、已失效或暂时无法解析')
}
