/**
 * GET /v1/gold-price · 获取贵金属、金店、银行金条和黄金回收价格。
 *
 * Query:
 *   encode|encoding  json|text|markdown|md，默认 json
 */

import {
  formatGoldPriceMarkdown,
  formatGoldPriceText,
  getGoldPrice,
} from '~~/server/lib/gold-price'
import type { OpenApiHandlerContext } from '~~/server/utils/open-api-handler-context'

export default defineOpenApiEventHandler(async (_event, api: OpenApiHandlerContext) => {
  try {
    const data = await getGoldPrice(api.signal)
    return api.respond(data, {
      message: '获取贵金属价格成功',
      text: formatGoldPriceText,
      markdown: formatGoldPriceMarkdown,
      headers: { 'cache-control': 'public, max-age=60' }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '获取贵金属价格失败'
    return api.businessFail(502, 'UPSTREAM_ERROR', `获取贵金属价格失败：${message}`)
  }
})
