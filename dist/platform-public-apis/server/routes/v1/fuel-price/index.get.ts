/**
 * GET /v1/fuel-price · 查询国内油价。
 *
 * Query:
 *   region               查询地区，默认 北京；支持省 / 市 / 区县简称，如 北京、杭州、西湖
 *   encode|encoding      json|text|markdown|md，默认 json；两者均可选择输出格式
 *   force-update         传 1/true/yes 时跳过 60 分钟缓存，重新抓取上游
 */

import type { OpenApiHandlerContext } from '~~/server/utils/open-api-handler-context'
import { readQueryString } from '~~/server/utils/request-query'
import {
  DEFAULT_FUEL_PRICE_REGION,
} from '~~/server/lib/fuel-price/types'
import {
  findFuelRegion,
  formatFuelPriceMarkdown,
  formatFuelPriceText,
  getFuelPriceData
} from '~~/server/lib/fuel-price/price'

function readBooleanFlag(value: unknown): boolean {
  const normalized = readQueryString(value).trim().toLowerCase()
  return ['1', 'true', 'yes', 'y', 'on'].includes(normalized)
}

export default defineOpenApiEventHandler(async (_event, api: OpenApiHandlerContext) => {
  const query = api.query
  const regionKeyword = readQueryString(query.region, DEFAULT_FUEL_PRICE_REGION).trim() || DEFAULT_FUEL_PRICE_REGION
  const region = findFuelRegion(regionKeyword)

  if (!region) {
    return api.fail(400, 'UNSUPPORTED_REGION', `暂不支持 ${regionKeyword} 区域查询`)
  }

  const forceUpdate = readBooleanFlag(query['force-update'])

  try {
    const data = await getFuelPriceData(region, forceUpdate, api.signal)

    return api.respond(data, {
      message: '获取油价成功',
      text: formatFuelPriceText,
      markdown: formatFuelPriceMarkdown,
      headers: {
        'access-control-allow-origin': '*',
        'cache-control': forceUpdate ? 'no-store' : 'public, max-age=3600'
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '获取油价失败'
    return api.businessFail(502, 'UPSTREAM_ERROR', `获取油价失败：${message}`)
  }
})
