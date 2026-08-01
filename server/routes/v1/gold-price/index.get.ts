/**
 * GET /v1/gold-price · 获取贵金属、金店、银行金条和黄金回收价格。
 *
 * Query:
 *   encode|encoding  json|text|markdown|md，默认 json
 */

import type { H3Event } from 'h3'
import { getQuery, setResponseHeader } from 'h3'
import {
  formatGoldPriceMarkdown,
  formatGoldPriceText,
  getGoldPrice,
  isGoldPriceEncoding,
  type GoldPriceEncoding
} from '~~/server/lib/gold-price'
import { openApiBizFail } from '~~/server/utils/api-call-outcome'
import type { OpenApiHandlerContext } from '~~/server/utils/api-guard'
import { openApiOk } from '~~/server/utils/open-api-response'
import { ensureRequestId } from '~~/server/utils/request-id'
import { readQueryString } from '~~/server/utils/request-query'

function parseEncoding(query: Record<string, unknown>): GoldPriceEncoding {
  const value = readQueryString(query.encode || query.encoding).trim().toLowerCase()
  return isGoldPriceEncoding(value) ? value : 'json'
}

export default defineOpenApiEventHandler(async (event: H3Event, { signal }: OpenApiHandlerContext) => {
  const query = getQuery(event) as Record<string, unknown>
  const encoding = parseEncoding(query)

  try {
    const data = await getGoldPrice(signal)
    setResponseHeader(event, 'cache-control', 'public, max-age=60')

    if (encoding === 'text') {
      setResponseHeader(event, 'content-type', 'text/plain; charset=utf-8')
      setResponseHeader(event, 'x-request-id', ensureRequestId(event))
      return formatGoldPriceText(data)
    }

    if (encoding === 'markdown' || encoding === 'md') {
      setResponseHeader(event, 'content-type', 'text/markdown; charset=utf-8')
      setResponseHeader(event, 'x-request-id', ensureRequestId(event))
      return formatGoldPriceMarkdown(data)
    }

    return openApiOk(event, data, '获取贵金属价格成功')
  } catch (error) {
    const message = error instanceof Error ? error.message : '获取贵金属价格失败'
    return openApiBizFail(event, 502, 'UPSTREAM_ERROR', `获取贵金属价格失败：${message}`)
  }
})
