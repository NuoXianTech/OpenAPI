/**
 * GET /v1/fuel-price/regions · 列出油价接口支持的地区。
 */

import { readQueryString } from '~~/server/utils/request-query'
import { listFuelRegions } from '~~/server/lib/fuel-price/price'

export default defineOpenApiEventHandler((_event, api) => {
  const keyword = readQueryString(api.query.keyword).trim()
  const regions = listFuelRegions()
  const items = keyword
    ? regions.filter(item => item.region.includes(keyword))
    : regions

  return api.ok({
    total: items.length,
    items
  }, '获取油价地区列表成功')
})
