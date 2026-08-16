/**
 * GET /v1/qq-avatar · 获取 QQ 头像地址。
 *
 * Query:
 *   qq    5-12 位 QQ 号（必填）
 *   size  40|100|140|640，默认 100
 *   type  json|image，默认 json
 */

import {
  createQqAvatarData,
  normalizeQqNumber,
  parseQqAvatarOutputType,
  parseQqAvatarSize
} from '~~/server/lib/qq-avatar'
import type { OpenApiHandlerContext } from '~~/server/utils/open-api-handler-context'
import { readQueryString } from '~~/server/utils/request-query'

const SUCCESS_HEADERS = {
  'access-control-allow-origin': '*',
  'cache-control': 'public, max-age=86400'
} as const

export default defineOpenApiEventHandler(async (_event, api: OpenApiHandlerContext) => {
  const rawQq = readQueryString(api.query.qq)
  if (!rawQq.trim()) return api.fail(400, 'MISSING_QQ', '缺少参数 qq')

  const qq = normalizeQqNumber(rawQq)
  if (!qq) return api.fail(400, 'INVALID_QQ', 'qq 必须是 5-12 位且不以 0 开头的数字')

  const size = parseQqAvatarSize(readQueryString(api.query.size))
  if (!size) return api.fail(400, 'INVALID_SIZE', 'size 仅支持 40、100、140 或 640')

  const type = parseQqAvatarOutputType(readQueryString(api.query.type))
  if (!type) return api.fail(400, 'INVALID_TYPE', 'type 仅支持 json 或 image')

  const data = createQqAvatarData(qq, size)
  if (type === 'image') {
    api.setHeaders(SUCCESS_HEADERS)
    return api.redirect(data.url)
  }
  api.setHeaders(SUCCESS_HEADERS)
  return api.ok(data, '获取 QQ 头像信息成功')
})
