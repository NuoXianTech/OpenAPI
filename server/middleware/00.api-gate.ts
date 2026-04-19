/**
 * API Gate · 前置守卫中间件。
 *
 * 命名前缀 `00.` 保证字母序最早，先于 api-call-stats 执行。
 *
 * 仅对治理范围内路径（/api/v{N}/**）生效：
 *   1. 提取 (pathVersion, code)
 *   2. 从 manifest 查是否为"已知路由"（兜底，正常情况下必在）
 *   3. 从 DB 查 apis 记录（apiService.loadGuardConfig）→ 不存在返回 403
 *   4. matchEndpoint → 不命中返回 405
 *   5. runApiGuard 规则链
 *   6. 通过 → 挂 event.context.apiMeta / apiKey，附加 X-RateLimit-* 响应头
 *
 * 非治理路径（/api/auth/**、/api/admin/**、/api/user/**、/api/list 等）完全放行，
 * 不影响现有 api-call-stats 中间件的行为。
 */

import type { H3Event } from 'h3'
import { createError, getRequestURL, setResponseHeaders } from 'h3'
import { VERSION_CODE_PATTERN, isGuardedPath } from '~~/shared/config/apiGuard'
import { getManifestApi, matchEndpoint } from '~~/server/utils/apiManifest'
import { runApiGuard } from '~~/server/utils/apiGuard'
import { apiService } from '~~/server/service/apiService'

function normalizePathname(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1)
  return pathname
}

export default defineEventHandler(async (event: H3Event) => {
  const url = getRequestURL(event)
  const pathname = normalizePathname(url.pathname)
  if (!isGuardedPath(pathname)) return

  const m = VERSION_CODE_PATTERN.exec(pathname)
  if (!m) return // /api/v 但格式异常，放行给 Nitro 处理（一般 404）

  const pathVersion = m[1]!
  const code = m[2]!
  const method = (event.method || 'GET').toUpperCase()

  // [1] manifest 中不存在 → 说明既没有代码文件也没登记，默认交还给 Nitro（通常 404）
  const manifest = getManifestApi(pathVersion, code)
  if (!manifest) return

  // [2] DB 中未登记
  const api = await apiService.loadGuardConfig(pathVersion, code)
  if (!api) {
    throw createError({
      statusCode: 403,
      statusMessage: 'API_NOT_REGISTERED',
      message: '接口未登记，请联系管理员',
      data: { code: 'API_NOT_REGISTERED', pathVersion, apiCode: code },
    })
  }

  // 尽早挂 apiStatsTarget，使后续即便被规则链拒绝也能被 api-call-stats 中间件记录
  event.context.apiStatsTarget = {
    apiId: api.id,
    apiPath: api.apiPath,
    pathVersion,
    code,
  }

  // [3] 方法/路径匹配（动态路由在此解析）
  const match = matchEndpoint(pathVersion, code, pathname, method)
  if (!match) {
    throw createError({
      statusCode: 405,
      statusMessage: 'METHOD_NOT_ALLOWED',
      message: '请求方法不受支持',
      data: { code: 'METHOD_NOT_ALLOWED', allowed: manifest.endpoints.map(e => e.method) },
    })
  }

  // [4] 规则链
  const result = await runApiGuard({ event, api, match })
  if (!result.passed) {
    if (result.headers) setResponseHeaders(event, result.headers)
    throw createError({
      statusCode: result.error.status,
      statusMessage: result.error.code,
      message: result.error.msg,
      data: { code: result.error.code, outcome: result.outcome },
    })
  }

  // [5] 通过：挂载 context，让后置中间件 / 业务 handler 读取
  event.context.apiMeta = {
    api,
    manifest,
    endpoint: match.endpoint,
    params: match.params,
    startedAt: Date.now(),
  }
  event.context.apiKey = result.apiKey
    ? { id: result.apiKey.id, userId: result.apiKey.userId, scopes: result.apiKey.scopes ?? null }
    : null

  if (Object.keys(result.rateLimitHeaders).length > 0) {
    setResponseHeaders(event, result.rateLimitHeaders)
  }
})
