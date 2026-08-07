/**
 * GET /v1/minecraft · 查询 Minecraft Java 版玩家资料、皮肤和披风。
 *
 * Query:
 *   id    玩家名称、无连字符 UUID 或标准 UUID（必填）
 *   type  json|skin|cape，默认 json
 */

import {
  classifyMinecraftError,
  createMinecraftInputError,
  getMinecraftProfile,
  normalizeMinecraftIdentifier,
  parseMinecraftOutputType
} from '~~/server/lib/minecraft'
import type { OpenApiHandlerContext } from '~~/server/utils/open-api-handler-context'
import { readQueryString } from '~~/server/utils/request-query'

export default defineOpenApiEventHandler(async (_event, api: OpenApiHandlerContext) => {
  const rawIdentifier = readQueryString(api.query.id)
  const identifier = normalizeMinecraftIdentifier(rawIdentifier)
  const type = parseMinecraftOutputType(readQueryString(api.query.type))

  try {
    if (!rawIdentifier.trim()) throw createMinecraftInputError('MISSING_ID')
    if (!identifier) throw createMinecraftInputError('INVALID_ID')
    if (!type) throw createMinecraftInputError('INVALID_TYPE')

    const data = await getMinecraftProfile(identifier, api.signal)
    api.setHeaders({ 'cache-control': 'public, max-age=300' })
    if (type === 'skin') {
      if (!data.skin) return api.businessFail(404, 'SKIN_NOT_FOUND', '该玩家没有可用的皮肤纹理')
      return api.redirect(data.skin.url)
    }
    if (type === 'cape') {
      if (!data.cape) return api.businessFail(404, 'CAPE_NOT_FOUND', '该玩家没有可用的披风纹理')
      return api.redirect(data.cape.url)
    }
    return api.ok(data, '获取 Minecraft 玩家资料成功')
  } catch (error) {
    const failure = classifyMinecraftError(error)
    return failure.biz
      ? api.businessFail(failure.status, failure.code, failure.message)
      : api.fail(failure.status, failure.code, failure.message)
  }
}, {
  ignoreStatisticsStatusCodes: [404]
})
