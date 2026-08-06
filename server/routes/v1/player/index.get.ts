/**
 * GET /v1/player · 生成 DPlayer 视频播放器 HTML。
 *
 * Query:
 *   url       视频地址（必填，http/https）
 *   type      auto|hls|flv|dash|normal，默认 auto
 *   cover     封面地址（可选，http/https）
 *   live      是否直播，默认 false
 *   muted     是否静音，默认 false
 *   autoplay  是否自动播放，默认 false
 *   hideplay  是否隐藏控制条，默认 false
 *   loop      是否循环，默认 false
 *   lang      en|zh-cn|zh-tw|ko-kr|de|ja|ru，默认 zh-cn
 *   volume    0~1，默认 0.7
 */

import { parseDplayerOptions } from '~~/server/lib/player/query'
import { renderDplayerHtml } from '~~/server/lib/player/html'
import { isPlayerEngineEnabled } from '~~/server/lib/player/capability-config'

export default defineOpenApiEventHandler(async (_event, api) => {
  if (!await isPlayerEngineEnabled('dplayer')) {
    return api.fail(403, 'PLAYER_ENGINE_DISABLED', 'DPlayer 播放器已被管理员关闭')
  }
  const options = parseDplayerOptions(api.query)
  if (!options) {
    return api.fail(400, 'INVALID_PARAMETER', '视频地址无效，请传入 http/https url')
  }

  return api.raw(renderDplayerHtml(options), {
    contentType: 'text/html; charset=utf-8',
    headers: {
      'access-control-allow-origin': '*',
      'cache-control': 'no-store'
    }
  })
})
