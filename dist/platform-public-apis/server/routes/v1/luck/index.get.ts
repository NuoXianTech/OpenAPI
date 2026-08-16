/**
 * GET /v1/luck · 随机获取一条今日运势。
 *
 * Query:
 *   id               0-18 的运势类别 ID；默认随机
 *   encode|encoding  json|text|markdown|md，默认 json
 */

import {
  formatLuckMarkdown,
  formatLuckText,
  getLuck,
  parseLuckId
} from '~~/server/lib/luck'
import { readQueryString } from '~~/server/utils/request-query'

export default defineOpenApiEventHandler((_event, api) => {
  const id = parseLuckId(readQueryString(api.query.id))
  if (id === null) {
    return api.fail(400, 'INVALID_ID', 'id 必须是非负整数且不能包含前导零')
  }

  const data = getLuck(id)
  if (!data) {
    return api.fail(404, 'LUCK_NOT_FOUND', `未找到 id 为 ${id} 的运势`)
  }

  return api.respond(data, {
    message: '获取今日运势成功',
    text: formatLuckText,
    markdown: formatLuckMarkdown,
    headers: {
      'cache-control': 'no-store',
      'pragma': 'no-cache'
    }
  })
})
