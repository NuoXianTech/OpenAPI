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

import type { H3Event } from 'h3'
import { getQuery, setResponseHeader } from 'h3'
import { parseDplayerOptions } from '~~/server/lib/player/query'
import { renderDplayerHtml } from '~~/server/lib/player/html'
import { openApiFail } from '~~/server/utils/open-api-response'
import { ensureRequestId } from '~~/server/utils/request-id'
import { isPlayerEngineEnabled } from '~~/server/lib/player/capability-config'

export default defineEventHandler(async (event: H3Event) => {
  if (!await isPlayerEngineEnabled('dplayer')) {
    return openApiFail(event, 403, 'PLAYER_ENGINE_DISABLED', 'DPlayer 播放器已被管理员关闭')
  }
  const options = parseDplayerOptions(getQuery(event) as Record<string, unknown>)
  if (!options) {
    return openApiFail(event, 400, 'INVALID_PARAMETER', '视频地址无效，请传入 http/https url')
  }

  setResponseHeader(event, 'access-control-allow-origin', '*')
  setResponseHeader(event, 'cache-control', 'no-store')
  setResponseHeader(event, 'content-type', 'text/html; charset=utf-8')
  setResponseHeader(event, 'x-request-id', ensureRequestId(event))
  return renderDplayerHtml(options)
})
