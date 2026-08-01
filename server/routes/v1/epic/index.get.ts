/**
 * GET /v1/epic · 获取 Epic Games 正在和即将免费的游戏。
 *
 * Query:
 *   encode|encoding  json|text|markdown|md，默认 json
 */

import type { H3Event } from 'h3'
import { getQuery, setResponseHeader } from 'h3'
import {
  formatEpicMarkdown,
  formatEpicText,
  getEpicFreeGames,
  isEpicEncoding,
  type EpicEncoding
} from '~~/server/lib/epic'
import { openApiBizFail } from '~~/server/utils/api-call-outcome'
import type { OpenApiHandlerContext } from '~~/server/utils/api-guard'
import { openApiOk } from '~~/server/utils/open-api-response'
import { ensureRequestId } from '~~/server/utils/request-id'
import { readQueryString } from '~~/server/utils/request-query'

function parseEncoding(query: Record<string, unknown>): EpicEncoding {
  const value = readQueryString(query.encode || query.encoding).trim().toLowerCase()
  return isEpicEncoding(value) ? value : 'json'
}

export default defineOpenApiEventHandler(async (event: H3Event, { signal }: OpenApiHandlerContext) => {
  const query = getQuery(event) as Record<string, unknown>
  const encoding = parseEncoding(query)

  try {
    const games = await getEpicFreeGames(signal)
    setResponseHeader(event, 'cache-control', 'public, max-age=300')

    if (encoding === 'text') {
      setResponseHeader(event, 'content-type', 'text/plain; charset=utf-8')
      setResponseHeader(event, 'x-request-id', ensureRequestId(event))
      return formatEpicText(games)
    }

    if (encoding === 'markdown' || encoding === 'md') {
      setResponseHeader(event, 'content-type', 'text/markdown; charset=utf-8')
      setResponseHeader(event, 'x-request-id', ensureRequestId(event))
      return formatEpicMarkdown(games)
    }

    return openApiOk(event, games, '获取 Epic 免费游戏成功')
  } catch (error) {
    const message = error instanceof Error ? error.message : '获取 Epic 免费游戏失败'
    return openApiBizFail(event, 502, 'UPSTREAM_ERROR', `获取 Epic 免费游戏失败：${message}`)
  }
})
