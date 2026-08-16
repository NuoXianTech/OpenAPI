import { getMusicLyrics, getMusicPicture, getMusicTracks, getMusicUrl, searchMusic } from '~~/server/lib/music/client'
import { isMusicPlatformEnabled } from '~~/server/lib/music/capability-config'
import { formatMusicLyrics, normalizeMusicRedirectUrl, toPublicMusicTracks } from '~~/server/lib/music/public-contract'
import { parseMusicRequestQuery } from '~~/server/lib/music/request'
import { systemSettingsService } from '~~/server/services/system-settings-service'
import type { OpenApiHandlerContext } from '~~/server/utils/open-api-handler-context'

async function handleMusicRequest(_event: unknown, api: OpenApiHandlerContext) {
  const parsed = parseMusicRequestQuery(api.query)
  if (!parsed.ok) return api.fail(400, parsed.code, parsed.message)

  const request = parsed.data
  if (!await isMusicPlatformEnabled(request.platform)) {
    return api.fail(403, 'MUSIC_SERVER_DISABLED', `音乐平台 ${request.platform} 已被管理员关闭`)
  }

  try {
    if (request.operation === 'url' || request.operation === 'pic') {
      const resource = request.operation === 'url'
        ? await getMusicUrl(request.platform, request.id, api.signal)
        : await getMusicPicture(request.platform, request.id, api.signal)
      const target = normalizeMusicRedirectUrl(request.platform, resource.url)
      if (!target) {
        const message = request.operation === 'url' && request.platform === 'tencent'
          ? '未获取到 QQ 音乐播放地址，歌曲可能需要登录、会员权限或受版权限制'
          : '未找到可用的音乐资源'
        return api.businessFail(404, 'MUSIC_RESOURCE_NOT_FOUND', message)
      }

      return api.redirect(target)
    }

    if (request.operation === 'lrc') {
      const lyrics = await getMusicLyrics(request.platform, request.id, api.signal)
      const content = formatMusicLyrics(lyrics)
      if (!content.trim()) {
        return api.businessFail(404, 'MUSIC_LYRICS_NOT_FOUND', '未找到可用的歌词')
      }
      return api.raw(content, { contentType: 'text/plain; charset=utf-8' })
    }

    const tracks = request.operation === 'search'
      ? await searchMusic({
          keyword: request.id,
          platform: request.platform,
          page: request.page,
          limit: request.limit
        }, api.signal)
      : await getMusicTracks(request.platform, request.operation, request.id, request.limit, api.signal)
    if (request.operation !== 'search' && tracks.length === 0) {
      return api.businessFail(404, 'MUSIC_DATA_NOT_FOUND', '未找到对应的音乐数据')
    }
    const siteUrl = await systemSettingsService.get('siteUrl')
    const items = toPublicMusicTracks(tracks, new URL(siteUrl))

    return api.ok({
      server: request.platform,
      type: request.operation,
      items,
      total: items.length,
      ...(request.operation === 'search' ? { page: request.page, limit: request.limit } : {})
    }, '获取音乐数据成功')
  } catch (error) {
    const message = error instanceof Error ? error.message : '音乐服务调用失败'
    return api.businessFail(502, 'UPSTREAM_ERROR', message)
  }
}

export default defineOpenApiEventHandler(handleMusicRequest)
