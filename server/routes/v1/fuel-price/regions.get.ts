/**
 * GET /v1/fuel-price/regions · 列出油价接口支持的地区。
 */

import type { H3Event } from 'h3'
import { getQuery } from 'h3'
import { openApiOk } from '~~/server/utils/open-api-response'
import { readQueryString } from '~~/server/utils/request-query'
import { listFuelRegions } from '~~/server/lib/fuel-price/price'

export default defineOpenApiEventHandler((event: H3Event) => {
  const query = getQuery(event) as Record<string, unknown>
  const keyword = readQueryString(query.keyword).trim()
  const regions = listFuelRegions()
  const items = keyword
    ? regions.filter(item => item.region.includes(keyword))
    : regions

  return openApiOk(event, {
    total: items.length,
    items
  }, '获取油价地区列表成功')
})
