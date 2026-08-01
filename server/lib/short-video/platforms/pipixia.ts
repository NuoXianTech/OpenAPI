/** Adapted from dist/api/short_videos (MIT, Copyright 2025 jiuhunwl). */

import { createShortVideoError } from '../types'
import { asArray, asRecord, collectMediaUrls, firstMediaUrl, firstText } from '../values'
import { DESKTOP_BROWSER_USER_AGENT, requestPlatformJson, resolvePlatformUrl } from '../http'

const PLATFORM = 'pipixia'
const ALLOWED_HOSTS = ['pipix.com', 'pipixia.com'] as const

export function extractPipixiaItemId(url: URL): string | null {
  return /\/item\/([^/?#]+)/i.exec(url.pathname)?.[1] ?? url.searchParams.get('cell_id')
}

function findPipixiaItem(payload: Record<string, unknown>): Record<string, unknown> {
  const data = asRecord(payload.data)
  const direct = asRecord(data.item ?? data.cell)
  if (Object.keys(direct).length > 0) return direct

  for (const comment of asArray(data.cell_comments)) {
    const item = asRecord(asRecord(asRecord(comment).comment_info).item)
    if (Object.keys(item).length > 0) return item
  }
  return {}
}

export async function parsePipixia(sourceUrl: URL): Promise<unknown> {
  const resolvedUrl = extractPipixiaItemId(sourceUrl)
    ? sourceUrl
    : await resolvePlatformUrl(PLATFORM, sourceUrl, ALLOWED_HOSTS, {
        'user-agent': DESKTOP_BROWSER_USER_AGENT
      })
  const itemId = extractPipixiaItemId(resolvedUrl)
  if (!itemId) {
    throw createShortVideoError('business', 422, 'PARSE_FAILED', '无法从皮皮虾链接提取内容 ID')
  }

  const apiUrl = new URL('https://h5.pipix.com/bds/cell/cell_h5_comment/')
  apiUrl.search = new URLSearchParams({
    count: '5',
    aid: '1319',
    app_name: 'super',
    cell_id: itemId
  }).toString()
  const payload = await requestPlatformJson<Record<string, unknown>>(
    PLATFORM,
    apiUrl,
    ALLOWED_HOSTS,
    {
      headers: {
        'referer': resolvedUrl.toString(),
        'user-agent': DESKTOP_BROWSER_USER_AGENT
      }
    }
  )

  const item = findPipixiaItem(payload)
  const author = asRecord(item.author)
  const statistics = asRecord(item.stats ?? item.statistics)
  const video = asRecord(asRecord(item.video).video_high)
  const note = asRecord(item.note)
  const images = asArray(note.multi_image).flatMap(value => (
    collectMediaUrls(asRecord(value).url_list)
  ))
  const videoUrl = firstMediaUrl(video.url, collectMediaUrls(video.url_list)[0])
  if (!videoUrl && images.length === 0) {
    throw createShortVideoError('business', 422, 'PARSE_FAILED', '皮皮虾内容未返回可用媒体')
  }

  return {
    code: 200,
    msg: '解析成功',
    data: {
      type: videoUrl ? 'video' : 'image',
      title: firstText(item.content),
      author: {
        name: firstText(author.name),
        id: firstText(author.id, author.uid),
        avatar: firstMediaUrl(collectMediaUrls(asRecord(author.avatar).download_list)[0], author.avatar)
      },
      like: statistics.digg_count ?? statistics.diggCount ?? item.digg_count,
      time: item.create_time ?? item.createTime,
      cover: firstMediaUrl(collectMediaUrls(asRecord(item.cover).url_list)[0]),
      url: videoUrl,
      images
    }
  }
}
