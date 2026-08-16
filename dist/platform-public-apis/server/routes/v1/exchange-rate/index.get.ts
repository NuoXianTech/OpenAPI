/**
 * GET /v1/exchange-rate · 查询指定基准货币的汇率。
 *
 * Query:
 *   currency         ISO 4217 三位货币代码，默认 CNY
 *   encode|encoding  json|text|markdown|md，默认 json；两者均可选择输出格式
 */

import type { OpenApiHandlerContext } from '~~/server/utils/open-api-handler-context'
import { formatExchangeRateMarkdown, formatExchangeRateText, getExchangeRates, normalizeCurrencyCode } from '~~/server/lib/exchange-rate'
import { DEFAULT_EXCHANGE_RATE_CURRENCY } from '~~/server/lib/exchange-rate/types'
import { readQueryString } from '~~/server/utils/request-query'

async function handleExchangeRate(_event: unknown, api: OpenApiHandlerContext) {
  const query = api.query
  const currency = normalizeCurrencyCode(readQueryString(query.currency, DEFAULT_EXCHANGE_RATE_CURRENCY))
  if (!currency) return api.fail(400, 'INVALID_CURRENCY', 'currency 必须是 ISO 4217 三位货币代码')

  try {
    const data = await getExchangeRates(currency, api.signal)
    return api.respond(data, {
      message: '获取汇率成功',
      text: formatExchangeRateText,
      markdown: formatExchangeRateMarkdown,
      headers: { 'cache-control': 'public, max-age=3600' }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '获取汇率失败'
    return api.businessFail(502, 'UPSTREAM_ERROR', `获取汇率失败：${message}`)
  }
}

export default defineOpenApiEventHandler(handleExchangeRate)
