/**
 * GET /v1/epic · 获取 Epic Games 正在和即将免费的游戏。
 *
 * Query:
 *   encode|encoding  json|text|markdown|md，默认 json
 */

import {
  formatEpicMarkdown,
  formatEpicText,
  getEpicFreeGames,
} from '~~/server/lib/epic'
import type { OpenApiHandlerContext } from '~~/server/utils/open-api-handler-context'

export default defineOpenApiEventHandler(async (_event, api: OpenApiHandlerContext) => {
  try {
    const games = await getEpicFreeGames(api.signal)
    return api.respond(games, {
      message: '获取 Epic 免费游戏成功',
      text: formatEpicText,
      markdown: formatEpicMarkdown,
      headers: { 'cache-control': 'public, max-age=300' }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '获取 Epic 免费游戏失败'
    return api.businessFail(502, 'UPSTREAM_ERROR', `获取 Epic 免费游戏失败：${message}`)
  }
})
