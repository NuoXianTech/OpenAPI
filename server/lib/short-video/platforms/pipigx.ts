/** Adapted from dist/api/short_videos (MIT, Copyright 2025 jiuhunwl). */

import { createShortVideoError } from '../types'
import { asArray, asRecord, firstMediaUrl, firstText } from '../values'
import { DESKTOP_BROWSER_USER_AGENT, requestPlatformJson, resolvePlatformUrl } from '../http'

const PLATFORM = 'pipigx'
const ALLOWED_HOSTS = ['ippzone.com', 'pipigx.com'] as const

export function extractPipigxParams(url: URL): { pid: string, mid: string } | null {
  const pid = url.searchParams.get('pid')
  const mid = url.searchParams.get('mid')
  return pid && mid ? { pid, mid } : null
}

export async function parsePipigx(sourceUrl: URL): Promise<unknown> {
  let params = extractPipigxParams(sourceUrl)
  if (!params) {
    const resolvedUrl = await resolvePlatformUrl(PLATFORM, sourceUrl, ALLOWED_HOSTS, {
      'user-agent': DESKTOP_BROWSER_USER_AGENT
    })
    params = extractPipigxParams(resolvedUrl)
  }
  if (!params) {
    throw createShortVideoError('business', 422, 'PARSE_FAILED', '皮皮搞笑链接缺少 pid 或 mid')
  }

  const payload = await requestPlatformJson<Record<string, unknown>>(
    PLATFORM,
    'https://h5.pipigx.com/ppapi/share/fetch_content',
    ALLOWED_HOSTS,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'user-agent': DESKTOP_BROWSER_USER_AGENT
      },
      body: JSON.stringify({
        pid: Number(params.pid),
        mid: Number(params.mid),
        type: 'post'
      })
    }
  )

  const post = asRecord(asRecord(payload.data).post)
  const video = asRecord(asArray(post.videos)[0])
  const videoUrl = firstMediaUrl(video.url)
  if (!videoUrl) {
    throw createShortVideoError('business', 422, 'PARSE_FAILED', '皮皮搞笑内容未返回可用视频')
  }

  const user = asRecord(post.user ?? post.author)
  const thumb = firstText(video.thumb)
  return {
    code: 200,
    msg: '解析成功',
    data: {
      type: 'video',
      title: firstText(post.content, post.title),
      author: {
        name: firstText(user.name, user.nickname),
        id: firstText(user.id, user.mid),
        avatar: firstMediaUrl(user.avatar, user.head)
      },
      like: post.likes ?? post.like_count ?? post.likeCount,
      time: post.created_at ?? post.create_time ?? post.createTime,
      cover: thumb ? `https://file.ippzone.com/img/frame/id/${encodeURIComponent(thumb)}` : '',
      video: videoUrl
    }
  }
}
