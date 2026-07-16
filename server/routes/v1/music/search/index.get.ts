import type { H3Event } from 'h3'
import { getQuery } from 'h3'
import { searchMusic } from '~~/server/lib/music/client'
import { readBoundedInteger, readMusicPlatform } from '~~/server/lib/music/request'
import { openApiBizFail } from '~~/server/utils/api-call-outcome'
import { openApiFail, openApiOk } from '~~/server/utils/open-api-response'
import { readQueryString } from '~~/server/utils/request-query'

async function handleMusicSearch(event: H3Event) {
  const query = getQuery(event)
  const keyword = readQueryString(query.q).trim()
  const platform = await readMusicPlatform(event)
  const page = readBoundedInteger(query.page, 1, 1, 1000)
  const pageSize = readBoundedInteger(query.pageSize, 30, 1, 100)
  const type = readBoundedInteger(query.type, 1, 1, 10_000)

  if (!keyword) return openApiFail(event, 400, 'MISSING_QUERY', 'q 查询参数不能为空')
  if (!platform) return openApiFail(event, 400, 'UNSUPPORTED_PLATFORM', '不支持指定的音乐平台')
  if (page === null || pageSize === null || type === null) return openApiFail(event, 400, 'INVALID_PARAMETER', '分页或搜索类型参数无效')

  try {
    const items = await searchMusic({ keyword, platform, page, pageSize, type })
    return openApiOk(event, { items, total: items.length, page, pageSize, platform })
  } catch (error) {
    const message = error instanceof Error ? error.message : '音乐搜索失败'
    return openApiBizFail(event, 502, 'UPSTREAM_ERROR', message)
  }
}

export default defineOpenApiEventHandler(handleMusicSearch)
