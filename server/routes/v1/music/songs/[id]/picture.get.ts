import type { H3Event } from 'h3'
import { getQuery } from 'h3'
import { getMusicPicture } from '~~/server/lib/music/client'
import { readBoundedInteger, readMusicRouteContext } from '~~/server/lib/music/request'
import { openApiBizFail } from '~~/server/utils/api-call-outcome'
import { openApiFail, openApiOk } from '~~/server/utils/open-api-response'

async function handleMusicPicture(event: H3Event) {
  const context = await readMusicRouteContext(event)
  const size = readBoundedInteger(getQuery(event).size, 300, 50, 2000)
  if (!context || size === null) return openApiFail(event, 400, 'INVALID_PARAMETER', '歌曲 ID、平台或 size 参数无效')

  try {
    return openApiOk(event, await getMusicPicture(context.platform, context.id, size))
  } catch (error) {
    const message = error instanceof Error ? error.message : '封面获取失败'
    return openApiBizFail(event, 502, 'UPSTREAM_ERROR', message)
  }
}

export default defineOpenApiEventHandler(handleMusicPicture)
