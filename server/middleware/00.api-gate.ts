/**
 * API Gate · 前置守卫中间件。
 *
 * 命名前缀 `00.` 保证字母序最早，确保 gate 在业务 handler 之前执行；
 * 调用统计由 `server/plugins/apiCallStats.ts` 通过 Nitro `afterResponse`
 * hook 在响应发出后异步记录，与本中间件无顺序耦合。
 *
 * 仅对治理范围内路径（/v{N}/**）生效：
 *   1. 提取 (pathVersion, code)
 *   2. 从 manifest 查是否为"已知路由"（兜底，正常情况下必在）
 *   3. 从 DB 查 apis 记录（apiService.loadGuardConfig）→ 不存在返回 403
 *   4. matchEndpoint → 不命中返回 405
 *   5. runApiGuard 规则链
 *   6. 通过 → 挂 event.context.apiMeta / apiKey，附加 X-RateLimit-* 响应头
 *
 * 非治理路径（/api/auth/**、/api/admin/**、/api/user/**、/api/list 等）完全放行，
 * 不影响调用统计 plugin 的行为。
 *
 * 拒绝路径输出开放 API 标准响应壳（见 server/utils/openApiResponse.ts），
 * body `data` 恒为 null；机器可读的错误子类型由 body 字段 `code` 表达
 * （如 401 下的 MISSING_API_KEY / INVALID_API_KEY / REVOKED_API_KEY 区分）。
 */

import type { H3Event } from 'h3'
import { getRequestURL, send, setResponseHeader, setResponseHeaders } from 'h3'
import { API_GUARD_ERROR, VERSION_CODE_PATTERN, isGuardedPath } from '~~/shared/config/apiGuard'
import { getManifestApi, matchEndpoint } from '~~/server/utils/apiManifest'
import { runApiGuard } from '~~/server/utils/apiGuard'
import { apiService } from '~~/server/service/apiService'
import { openApiFail } from '~~/server/utils/openApiResponse'

type ErrorDef = (typeof API_GUARD_ERROR)[keyof typeof API_GUARD_ERROR]

function normalizePathname(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1)
  return pathname
}

/**
 * 拒绝请求时以开放 API 标准壳作答。直接通过 h3 的 send 写出，
 * 保证 middleware 阶段就终止请求，不会继续走到业务 handler。
 *
 * errorDef.code 作为 body `code` 字段输出，严守 restful-api-style.md §3.3
 * 「失败时 data 为 null」。其他上下文（如 405 的 Allow、429 的 Retry-After）走对应标准头。
 */
async function rejectWithOpenApi(event: H3Event, errorDef: ErrorDef) {
  const payload = openApiFail(event, errorDef.status, errorDef.code, errorDef.msg)
  setResponseHeader(event, 'content-type', 'application/json; charset=utf-8')
  await send(event, JSON.stringify(payload))
}

export default defineEventHandler(async (event: H3Event) => {
  const url = getRequestURL(event)
  const pathname = normalizePathname(url.pathname)
  if (!isGuardedPath(pathname)) return

  const m = VERSION_CODE_PATTERN.exec(pathname)
  if (!m) return // /v{N}/ 但格式异常，放行给 Nitro 处理（一般 404）

  const pathVersion = m[1]!
  const code = m[2]!
  const method = (event.method || 'GET').toUpperCase()

  // [1] manifest 中不存在 → 说明既没有代码文件也没登记，默认交还给 Nitro（通常 404）
  const manifest = getManifestApi(pathVersion, code)
  if (!manifest) return

  // [2] DB 中未登记
  const api = await apiService.loadGuardConfig(pathVersion, code)
  if (!api) {
    return rejectWithOpenApi(event, API_GUARD_ERROR.NOT_REGISTERED)
  }

  // 尽早挂 apiStatsTarget，使后续即便被规则链拒绝也能被调用统计 plugin 记录。
  // 仅当 isStatistics=true 时挂载，否则 plugin 的 fallback (resolveStatisticsTarget)
  // 也会按 isStatistics 过滤而返回 null，自然短路、不写库。
  if (api.isStatistics) {
    event.context.apiStatsTarget = {
      apiId: api.id,
      apiPath: api.apiPath,
      pathVersion,
      code
    }
  }

  // [3] 方法/路径匹配（动态路由在此解析）
  const match = matchEndpoint(pathVersion, code, pathname, method)
  if (!match) {
    setResponseHeader(event, 'allow', manifest.endpoints.map(e => e.method).join(', '))
    return rejectWithOpenApi(event, API_GUARD_ERROR.METHOD_NOT_ALLOWED)
  }

  // [4] 规则链
  const result = await runApiGuard({ event, api, match })
  if (!result.passed) {
    if (result.headers) setResponseHeaders(event, result.headers)
    return rejectWithOpenApi(event, result.error)
  }

  // [5] 通过：挂载 context，让后置中间件 / 业务 handler 读取
  event.context.apiMeta = {
    api,
    manifest,
    endpoint: match.endpoint,
    params: match.params,
    startedAt: Date.now()
  }
  event.context.apiKey = result.apiKey
    ? { id: result.apiKey.id, userId: result.apiKey.userId, scopes: result.apiKey.scopes ?? null }
    : null

  // 计费上下文 · 后置中间件根据该状态决定是否扣款。业务 handler 可通过
  // markApiCallSuccess / markApiCallFailed 显式覆盖判定。
  event.context.apiBilling = {
    costCredits: api.costCredits,
    apiKeyUserId: result.apiKey?.userId ?? null,
    // 默认按 statusCode 判定，业务可显式标记
    forcedOutcome: null as 'success' | 'failed' | null,
    failedCode: null as string | null,
    failedMessage: null as string | null
  }

  if (Object.keys(result.rateLimitHeaders).length > 0) {
    setResponseHeaders(event, result.rateLimitHeaders)
  }
})
