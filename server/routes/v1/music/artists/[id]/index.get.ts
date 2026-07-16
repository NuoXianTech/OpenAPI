import type { H3Event } from 'h3'
import { getQuery } from 'h3'
import { getArtistSongs } from '~~/server/lib/music/client'
import { readBoundedInteger, readMusicRouteContext } from '~~/server/lib/music/request'
import { openApiBizFail } from '~~/server/utils/api-call-outcome'
import { openApiFail, openApiOk } from '~~/server/utils/open-api-response'

async function handleArtistSongs(event: H3Event) {
  const context = await readMusicRouteContext(event)
  const limit = readBoundedInteger(getQuery(event).limit, 50, 1, 100)
  if (!context || limit === null) return openApiFail(event, 400, 'INVALID_PARAMETER', '歌手 ID、平台或 limit 参数无效')

  try {
    const items = await getArtistSongs(context.platform, context.id, limit)
    return openApiOk(event, { items, total: items.length, platform: context.platform })
  } catch (error) {
    const message = error instanceof Error ? error.message : '歌手作品获取失败'
    return openApiBizFail(event, 502, 'UPSTREAM_ERROR', message)
  }
}

export default defineOpenApiEventHandler(handleArtistSongs)
