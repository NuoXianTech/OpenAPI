/**
 * GET /v1/60s · 获取“每天 60 秒读懂世界”。
 *
 * Query:
 *   date             YYYY-MM-DD，默认按 Asia/Shanghai 获取当天内容
 *   encode|encoding  json|text|markdown|md，默认 json
 */

import {
  formatDaily60sMarkdown,
  formatDaily60sText,
  getDaily60s,
  parseDaily60sDate
} from '~~/server/lib/60s'
import type { OpenApiHandlerContext } from '~~/server/utils/open-api-handler-context'
import { readQueryString } from '~~/server/utils/request-query'

export default defineOpenApiEventHandler(async (_event, api: OpenApiHandlerContext) => {
  const rawDate = readQueryString(api.query.date)
  const date = parseDaily60sDate(rawDate)
  if (!date) return api.fail(400, 'INVALID_DATE', 'date 必须是有效的 YYYY-MM-DD 日期')

  try {
    const data = await getDaily60s(date, {
      fallback: !rawDate.trim(),
      signal: api.signal
    })
    const headers = { 'cache-control': 'public, max-age=900' }

    return api.respond(data, {
      message: '获取每日 60 秒成功',
      text: formatDaily60sText,
      markdown: formatDaily60sMarkdown,
      headers
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '获取每日 60 秒失败'
    return api.businessFail(502, 'UPSTREAM_ERROR', `获取每日 60 秒失败：${message}`)
  }
})
