/**
 * GET /v1/today-in-history · 查询指定月日的历史事件。
 *
 * Query:
 *   date             MM-DD 或 YYYY-MM-DD，默认按 Asia/Shanghai 获取今天
 *   encode|encoding  json|text|markdown|md，默认 json
 */

import type { H3Event } from 'h3'
import { getQuery, setResponseHeader } from 'h3'
import {
  formatTodayInHistoryMarkdown,
  formatTodayInHistoryText,
  getTodayInHistory,
  isTodayInHistoryEncoding,
  parseTodayInHistoryDate,
  type TodayInHistoryEncoding
} from '~~/server/lib/today-in-history'
import { openApiBizFail } from '~~/server/utils/api-call-outcome'
import type { OpenApiHandlerContext } from '~~/server/utils/api-guard'
import { openApiFail, openApiOk } from '~~/server/utils/open-api-response'
import { ensureRequestId } from '~~/server/utils/request-id'
import { readQueryString } from '~~/server/utils/request-query'

function parseEncoding(query: Record<string, unknown>): TodayInHistoryEncoding {
  const value = readQueryString(query.encode || query.encoding).trim().toLowerCase()
  return isTodayInHistoryEncoding(value) ? value : 'json'
}

export default defineOpenApiEventHandler(async (event: H3Event, { signal }: OpenApiHandlerContext) => {
  const query = getQuery(event) as Record<string, unknown>
  const dateValue = readQueryString(query.date)
  const date = parseTodayInHistoryDate(dateValue)
  if (!date) {
    return openApiFail(event, 400, 'INVALID_DATE', 'date 必须是有效的 MM-DD 或 YYYY-MM-DD 日期')
  }

  const encoding = parseEncoding(query)
  try {
    const data = await getTodayInHistory(date, signal)
    setResponseHeader(event, 'cache-control', 'public, max-age=3600')

    if (encoding === 'text') {
      setResponseHeader(event, 'content-type', 'text/plain; charset=utf-8')
      setResponseHeader(event, 'x-request-id', ensureRequestId(event))
      return formatTodayInHistoryText(data)
    }

    if (encoding === 'markdown' || encoding === 'md') {
      setResponseHeader(event, 'content-type', 'text/markdown; charset=utf-8')
      setResponseHeader(event, 'x-request-id', ensureRequestId(event))
      return formatTodayInHistoryMarkdown(data)
    }

    return openApiOk(event, data, '获取历史上的今天成功')
  } catch (error) {
    const message = error instanceof Error ? error.message : '获取历史事件失败'
    return openApiBizFail(event, 502, 'UPSTREAM_ERROR', `获取历史事件失败：${message}`)
  }
})
