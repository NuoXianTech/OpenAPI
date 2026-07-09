/**
 * GET /v1/fuel-price · 查询国内油价。
 *
 * Query:
 *   region               查询地区，默认 北京；支持省 / 市 / 区县简称，如 北京、杭州、西湖
 *   encode|encoding      json|text|markdown|md，默认 json；encoding 兼容 60s-api
 *   force-update         传 1/true/yes 时跳过 60 分钟缓存，重新抓取上游
 */

import type { H3Event } from 'h3'
import { getQuery, setResponseHeader } from 'h3'
import { openApiBizFail } from '~~/server/utils/api-call-outcome'
import { openApiFail, openApiOk } from '~~/server/utils/open-api-response'
import { ensureRequestId } from '~~/server/utils/request-id'
import { readQueryString } from '~~/server/utils/request-query'
import {
  DEFAULT_FUEL_PRICE_ENCODING,
  DEFAULT_FUEL_PRICE_REGION,
  isFuelPriceEncoding,
  type FuelPriceEncoding
} from '~~/server/lib/fuel-price/types'
import {
  findFuelRegion,
  formatFuelPriceMarkdown,
  formatFuelPriceText,
  getFuelPriceData
} from '~~/server/lib/fuel-price/price'

function parseEncoding(query: Record<string, unknown>): FuelPriceEncoding {
  const rawEncoding = readQueryString(query.encode || query.encoding).trim().toLowerCase()
  return isFuelPriceEncoding(rawEncoding) ? rawEncoding : DEFAULT_FUEL_PRICE_ENCODING
}

function readBooleanFlag(value: unknown): boolean {
  const normalized = readQueryString(value).trim().toLowerCase()
  return ['1', 'true', 'yes', 'y', 'on'].includes(normalized)
}

export default defineEventHandler(async (event: H3Event) => {
  const query = getQuery(event) as Record<string, unknown>
  const regionKeyword = readQueryString(query.region, DEFAULT_FUEL_PRICE_REGION).trim() || DEFAULT_FUEL_PRICE_REGION
  const region = findFuelRegion(regionKeyword)

  if (!region) {
    return openApiFail(event, 400, 'UNSUPPORTED_REGION', `暂不支持 ${regionKeyword} 区域查询`)
  }

  const encoding = parseEncoding(query)
  const forceUpdate = readBooleanFlag(query['force-update'])

  try {
    const data = await getFuelPriceData(region, forceUpdate)

    setResponseHeader(event, 'access-control-allow-origin', '*')
    setResponseHeader(event, 'cache-control', forceUpdate ? 'no-store' : 'public, max-age=3600')

    if (encoding === 'text') {
      setResponseHeader(event, 'content-type', 'text/plain; charset=utf-8')
      setResponseHeader(event, 'x-request-id', ensureRequestId(event))
      return formatFuelPriceText(data)
    }

    if (encoding === 'markdown' || encoding === 'md') {
      setResponseHeader(event, 'content-type', 'text/markdown; charset=utf-8')
      setResponseHeader(event, 'x-request-id', ensureRequestId(event))
      return formatFuelPriceMarkdown(data)
    }

    return openApiOk(event, data, '获取油价成功')
  } catch (error) {
    const message = error instanceof Error ? error.message : '获取油价失败'
    return openApiBizFail(event, 502, 'UPSTREAM_ERROR', `获取油价失败：${message}`)
  }
})
