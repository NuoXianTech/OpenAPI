import type { H3Event } from 'h3'
import { setResponseHeader } from 'h3'
import { getMusicLyrics } from '~~/server/lib/music/client'
import { readMusicRouteContext } from '~~/server/lib/music/request'
import { openApiBizFail } from '~~/server/utils/api-call-outcome'
import { openApiFail } from '~~/server/utils/open-api-response'
import { ensureRequestId } from '~~/server/utils/request-id'

async function handleMusicLyrics(event: H3Event) {
  const context = await readMusicRouteContext(event)
  if (!context) return openApiFail(event, 400, 'INVALID_PARAMETER', '歌曲 ID 不能为空且音乐平台必须受支持')

  try {
    const lyrics = await getMusicLyrics(context.platform, context.id)
    setResponseHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
    setResponseHeader(event, 'X-Request-Id', ensureRequestId(event))
    return lyrics.lyric
  } catch (error) {
    const message = error instanceof Error ? error.message : '歌词获取失败'
    return openApiBizFail(event, 502, 'UPSTREAM_ERROR', message)
  }
}

export default defineOpenApiEventHandler(handleMusicLyrics)
