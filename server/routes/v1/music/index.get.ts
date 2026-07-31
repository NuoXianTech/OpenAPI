import type { H3Event } from 'h3'
import { getQuery, getRequestURL, sendRedirect, setResponseHeader } from 'h3'
import { getMusicLyrics, getMusicPicture, getMusicTracks, getMusicUrl, searchMusic } from '~~/server/lib/music/client'
import { isMusicPlatformEnabled } from '~~/server/lib/music/capability-config'
import { formatMusicLyrics, normalizeMusicRedirectUrl, toPublicMusicTracks } from '~~/server/lib/music/public-contract'
import { parseMusicRequestQuery } from '~~/server/lib/music/request'
import { openApiBizFail } from '~~/server/utils/api-call-outcome'
import { openApiFail, openApiOk } from '~~/server/utils/open-api-response'
import { ensureRequestId } from '~~/server/utils/request-id'

async function handleMusicRequest(event: H3Event) {
  const parsed = parseMusicRequestQuery(getQuery(event) as Record<string, unknown>)
  if (!parsed.ok) return openApiFail(event, 400, parsed.code, parsed.message)

  const request = parsed.data
  if (!await isMusicPlatformEnabled(request.platform)) {
    return openApiFail(event, 403, 'MUSIC_SERVER_DISABLED', `音乐平台 ${request.platform} 已被管理员关闭`)
  }

  try {
    if (request.operation === 'url' || request.operation === 'pic') {
      const resource = request.operation === 'url'
        ? await getMusicUrl(request.platform, request.id)
        : await getMusicPicture(request.platform, request.id)
      const target = normalizeMusicRedirectUrl(request.platform, resource.url)
      if (!target) {
        return openApiBizFail(event, 404, 'MUSIC_RESOURCE_NOT_FOUND', '未找到可用的音乐资源')
      }

      setResponseHeader(event, 'X-Request-Id', ensureRequestId(event))
      return sendRedirect(event, target, 302)
    }

    if (request.operation === 'lrc') {
      const lyrics = await getMusicLyrics(request.platform, request.id)
      setResponseHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
      setResponseHeader(event, 'X-Request-Id', ensureRequestId(event))
      return formatMusicLyrics(lyrics)
    }

    const tracks = request.operation === 'search'
      ? await searchMusic({
          keyword: request.id,
          platform: request.platform,
          page: request.page,
          limit: request.limit
        })
      : await getMusicTracks(request.platform, request.operation, request.id, request.limit)
    const items = toPublicMusicTracks(tracks, getRequestURL(event))

    return openApiOk(event, {
      server: request.platform,
      type: request.operation,
      items,
      total: items.length,
      ...(request.operation === 'search' ? { page: request.page, limit: request.limit } : {})
    }, '获取音乐数据成功')
  } catch (error) {
    const message = error instanceof Error ? error.message : '音乐服务调用失败'
    return openApiBizFail(event, 502, 'UPSTREAM_ERROR', message)
  }
}

export default defineOpenApiEventHandler(handleMusicRequest)
