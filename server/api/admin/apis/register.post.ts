/**
 * Admin · 一键从 manifest 登记 / 重新同步一个 (pathVersion, code)。
 *
 * body: { pathVersion, code, overrides?: Partial<governance fields> }
 *
 * - 从 manifest 查 sourceDir / endpointCount / 推断 apiPath / httpMethod
 * - 已存在则刷新 manifest 投影字段（apiPath/httpMethod/sourceDir/endpointCount），治理字段保留
 * - 不存在则使用 DEFAULT_API_REGISTRATION + overrides 入库
 */

import type { H3Event } from 'h3'
import { createError } from 'h3'
import { API_MANIFEST } from '#api-manifest'
import { DEFAULT_API_REGISTRATION } from '~~/shared/config/apiGuard'
import { requireAdmin } from '~~/server/utils/auth'
import { apiService } from '~~/server/service/apiService'
import { operationLogService } from '~~/server/service/operationLogService'
import { report } from '~~/server/utils/report'

interface RegisterBody {
  pathVersion?: string
  code?: string
  overrides?: {
    name?: string
    shortDesc?: string
    description?: string
    docUrl?: string
    status?: number
    categoryId?: number | null
    isEnabled?: boolean
    isApiKey?: boolean
    isStatistics?: boolean
    requiresAuth?: boolean
    rateLimitPerSecond?: number
    rateLimitPerMinute?: number
    rateLimitPerHour?: number
    rateLimitPerDay?: number
    dailyQuota?: number
    costCredits?: number
    timeoutMs?: number
  }
}

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const body = await readBody<RegisterBody>(event)

  const pathVersion = (body.pathVersion || '').trim()
  const code = (body.code || '').trim()
  if (!pathVersion || !code) {
    throw createError({ statusCode: 400, message: 'pathVersion 和 code 均必填' })
  }

  const manifestApi = API_MANIFEST.find(a => a.pathVersion === pathVersion && a.code === code)
  if (!manifestApi) {
    throw createError({
      statusCode: 404,
      message: `manifest 中不存在 ${pathVersion}/${code}，请确认对应文件已创建并重启 dev 服务`,
    })
  }

  const methods = Array.from(new Set(manifestApi.endpoints.map(e => e.method))).filter(m => m !== 'ANY')
  const httpMethod = methods.length > 0 ? methods.join(',') : 'GET'
  const baseEp = manifestApi.endpoints.find(e => e.paramNames.length === 0) || manifestApi.endpoints[0]!
  const apiPath = baseEp.apiPath.replace(/\/:[^/]+$/, '') || `/${pathVersion}/${code}`

  const o = body.overrides || {}
  const defaults = {
    name: o.name || code,
    shortDesc: o.shortDesc || `${pathVersion} ${code}`,
    description: o.description || `自动登记于 ${manifestApi.sourceDir}`,
    docUrl: o.docUrl || '',
    status: typeof o.status === 'number' ? o.status : DEFAULT_API_REGISTRATION.status,
    categoryId: o.categoryId === undefined ? null : o.categoryId,
    isEnabled: o.isEnabled ?? DEFAULT_API_REGISTRATION.isEnabled,
    isApiKey: o.isApiKey ?? DEFAULT_API_REGISTRATION.isApiKey,
    isStatistics: o.isStatistics ?? DEFAULT_API_REGISTRATION.isStatistics,
    requiresAuth: o.requiresAuth ?? DEFAULT_API_REGISTRATION.requiresAuth,
    rateLimitPerSecond: o.rateLimitPerSecond ?? DEFAULT_API_REGISTRATION.rateLimitPerSecond,
    rateLimitPerMinute: o.rateLimitPerMinute ?? DEFAULT_API_REGISTRATION.rateLimitPerMinute,
    rateLimitPerHour: o.rateLimitPerHour ?? DEFAULT_API_REGISTRATION.rateLimitPerHour,
    rateLimitPerDay: o.rateLimitPerDay ?? DEFAULT_API_REGISTRATION.rateLimitPerDay,
    dailyQuota: o.dailyQuota ?? DEFAULT_API_REGISTRATION.dailyQuota,
    costCredits: o.costCredits ?? DEFAULT_API_REGISTRATION.costCredits,
    timeoutMs: o.timeoutMs ?? DEFAULT_API_REGISTRATION.timeoutMs,
  }

  const saved = await apiService.registerFromManifest({
    pathVersion,
    code,
    apiPath,
    httpMethod,
    sourceDir: manifestApi.sourceDir,
    endpointCount: manifestApi.endpoints.length,
    createdBy: admin.id || null,
    defaults,
  })

  await operationLogService.addLog({
    userId: admin.id || null,
    actor: admin.username,
    action: 'admin.api.register',
    resourceType: 'api',
    resourceId: String(saved?.id || ''),
    detail: { pathVersion, code, manifestSource: manifestApi.sourceDir },
  })

  return report(event, 200, 'ok', saved)
})
