import type { H3Event } from 'h3'
import { getQuery } from 'h3'
import { getMusicUrl } from '~~/server/lib/music/client'
import { readBoundedInteger, readMusicRouteContext } from '~~/server/lib/music/request'
import { openApiBizFail } from '~~/server/utils/api-call-outcome'
import { openApiFail, openApiOk } from '~~/server/utils/open-api-response'

async function handleMusicUrl(event: H3Event) {
  const context = readMusicRouteContext(event)
  const bitrate = readBoundedInteger(getQuery(event).bitrate, 320, 1, 9999)
  if (!context || bitrate === null) return openApiFail(event, 400, 'INVALID_PARAMETER', '歌曲 ID、平台或 bitrate 参数无效')

  try {
    return openApiOk(event, await getMusicUrl(context.platform, context.id, bitrate))
  } catch (error) {
    const message = error instanceof Error ? error.message : '播放地址获取失败'
    return openApiBizFail(event, 502, 'UPSTREAM_ERROR', message)
  }
}

export default defineEventHandler(handleMusicUrl)
