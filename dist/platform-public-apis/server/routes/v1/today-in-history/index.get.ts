/**
 * GET /v1/today-in-history · 查询指定月日的历史事件。
 *
 * Query:
 *   date             MM-DD 或 YYYY-MM-DD，默认按 Asia/Shanghai 获取今天
 *   encode|encoding  json|text|markdown|md，默认 json
 */

import {
  formatTodayInHistoryMarkdown,
  formatTodayInHistoryText,
  getTodayInHistory,
  parseTodayInHistoryDate
} from '~~/server/lib/today-in-history'
import type { OpenApiHandlerContext } from '~~/server/utils/open-api-handler-context'
import { readQueryString } from '~~/server/utils/request-query'

export default defineOpenApiEventHandler(async (_event, api: OpenApiHandlerContext) => {
  const query = api.query
  const dateValue = readQueryString(query.date)
  const date = parseTodayInHistoryDate(dateValue)
  if (!date) {
    return api.fail(400, 'INVALID_DATE', 'date 必须是有效的 MM-DD 或 YYYY-MM-DD 日期')
  }

  try {
    const data = await getTodayInHistory(date, api.signal)
    return api.respond(data, {
      message: '获取历史上的今天成功',
      text: formatTodayInHistoryText,
      markdown: formatTodayInHistoryMarkdown,
      headers: { 'cache-control': 'public, max-age=3600' }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '获取历史事件失败'
    return api.businessFail(502, 'UPSTREAM_ERROR', `获取历史事件失败：${message}`)
  }
})
