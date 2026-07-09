/**
 * GET /v1/player/art · 生成 ArtPlayer 视频播放器 HTML。
 *
 * Query:
 *   url              视频地址（必填，http/https）
 *   id               ArtPlayer id，可选
 *   type             m3u8|flv|mpd，默认空字符串（ArtPlayer 自动处理）
 *   lang             en|zh-cn，默认 zh-cn
 *   poster           封面地址（可选，http/https）
 *   theme            十六进制主题色，默认 #f00
 *   volume           0~1，默认 0.7
 *   islive/muted/autoplay/autoplayback/hideplay/automini/loop
 *   flip/playbackrate/aspectratio/setting/hotkey/pip/mutex/fullscreen/fullscreenweb/miniprogressbar/playsinline
 */

import type { H3Event } from 'h3'
import { getQuery, setResponseHeader } from 'h3'
import { parseArtplayerOptions } from '~~/server/lib/player/query'
import { renderArtplayerHtml } from '~~/server/lib/player/html'
import { openApiFail } from '~~/server/utils/open-api-response'
import { ensureRequestId } from '~~/server/utils/request-id'

export default defineEventHandler((event: H3Event) => {
  const options = parseArtplayerOptions(getQuery(event) as Record<string, unknown>)
  if (!options) {
    return openApiFail(event, 400, 'INVALID_PARAMETER', '视频地址无效，请传入 http/https url')
  }

  setResponseHeader(event, 'access-control-allow-origin', '*')
  setResponseHeader(event, 'cache-control', 'no-store')
  setResponseHeader(event, 'content-type', 'text/html; charset=utf-8')
  setResponseHeader(event, 'x-request-id', ensureRequestId(event))
  return renderArtplayerHtml(options)
})
