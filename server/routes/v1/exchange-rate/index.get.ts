/**
 * GET /v1/exchange-rate · 查询指定基准货币的汇率。
 *
 * Query:
 *   currency         ISO 4217 三位货币代码，默认 CNY
 *   encode|encoding  json|text|markdown|md，默认 json；两者均可选择输出格式
 */

import type { H3Event } from 'h3'
import { getQuery, setResponseHeader } from 'h3'
import { formatExchangeRateMarkdown, formatExchangeRateText, getExchangeRates, normalizeCurrencyCode } from '~~/server/lib/exchange-rate'
import { DEFAULT_EXCHANGE_RATE_CURRENCY, DEFAULT_EXCHANGE_RATE_ENCODING, isExchangeRateEncoding, type ExchangeRateEncoding } from '~~/server/lib/exchange-rate/types'
import { openApiBizFail } from '~~/server/utils/api-call-outcome'
import { openApiFail, openApiOk } from '~~/server/utils/open-api-response'
import { ensureRequestId } from '~~/server/utils/request-id'
import { readQueryString } from '~~/server/utils/request-query'

function parseEncoding(query: Record<string, unknown>): ExchangeRateEncoding {
  const value = readQueryString(query.encode || query.encoding).trim().toLowerCase()
  return isExchangeRateEncoding(value) ? value : DEFAULT_EXCHANGE_RATE_ENCODING
}

async function handleExchangeRate(event: H3Event) {
  const query = getQuery(event) as Record<string, unknown>
  const currency = normalizeCurrencyCode(readQueryString(query.currency, DEFAULT_EXCHANGE_RATE_CURRENCY))
  if (!currency) return openApiFail(event, 400, 'INVALID_CURRENCY', 'currency 必须是 ISO 4217 三位货币代码')

  const encoding = parseEncoding(query)

  try {
    const data = await getExchangeRates(currency)
    setResponseHeader(event, 'cache-control', 'public, max-age=3600')

    if (encoding === 'text') {
      setResponseHeader(event, 'content-type', 'text/plain; charset=utf-8')
      setResponseHeader(event, 'x-request-id', ensureRequestId(event))
      return formatExchangeRateText(data)
    }

    if (encoding === 'markdown' || encoding === 'md') {
      setResponseHeader(event, 'content-type', 'text/markdown; charset=utf-8')
      setResponseHeader(event, 'x-request-id', ensureRequestId(event))
      return formatExchangeRateMarkdown(data)
    }

    return openApiOk(event, data, '获取汇率成功')
  } catch (error) {
    const message = error instanceof Error ? error.message : '获取汇率失败'
    return openApiBizFail(event, 502, 'UPSTREAM_ERROR', `获取汇率失败：${message}`)
  }
}

export default defineOpenApiEventHandler(handleExchangeRate)
