import type { H3Event } from 'h3'
import { getMusicSongs } from '~~/server/lib/music/client'
import { readMusicRouteContext } from '~~/server/lib/music/request'
import { openApiBizFail } from '~~/server/utils/api-call-outcome'
import { openApiFail, openApiOk } from '~~/server/utils/open-api-response'

async function handleRequest(event: H3Event) {
  const context = await readMusicRouteContext(event)
  if (!context) return openApiFail(event, 400, 'INVALID_PARAMETER', '资源 ID 不能为空且音乐平台必须受支持')

  try {
    const items = await getMusicSongs(context.platform, 'album', context.id)
    return openApiOk(event, { items, total: items.length, platform: context.platform })
  } catch (error) {
    const message = error instanceof Error ? error.message : '专辑歌曲获取失败'
    return openApiBizFail(event, 502, 'UPSTREAM_ERROR', message)
  }
}

export default defineEventHandler(handleRequest)
