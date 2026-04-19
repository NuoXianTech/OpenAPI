/**
 * Admin · 一键从 manifest 登记一个 (pathVersion, code)。
 *
 * body: { pathVersion: 'v1', code: 'test', overrides?: Partial<defaults> }
 *
 * 行为：
 * - 从 manifest 查出该 code 的 apiPath / httpMethod（所有方法合并）/ sourceDir / endpointCount
 * - 用 DEFAULT_API_REGISTRATION + overrides 作为治理字段默认
 * - 幂等：已存在则仅刷新 apiPath/sourceDir/endpointCount，其他治理字段保留
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
    isEnabled?: boolean
    isApiKey?: boolean
    isStatistics?: boolean
    requiresAuth?: boolean
    rateLimitPerMinute?: number
    rateLimitPerHour?: number
    dailyQuota?: number
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
  // apiPath 展示用：取基础路径（最短的、不含 :param 的）
  const baseEp = manifestApi.endpoints.find(e => e.paramNames.length === 0) || manifestApi.endpoints[0]!
  const apiPath = baseEp.apiPath.replace(/\/:[^/]+$/, '') || `/api/${pathVersion}/${code}`

  const overrides = body.overrides || {}
  const defaults = {
    name: overrides.name || code,
    shortDesc: overrides.shortDesc || `${pathVersion} ${code}`,
    description: overrides.description || `自动登记于 ${manifestApi.sourceDir}`,
    docUrl: overrides.docUrl || '',
    isEnabled: overrides.isEnabled ?? DEFAULT_API_REGISTRATION.isEnabled,
    isApiKey: overrides.isApiKey ?? DEFAULT_API_REGISTRATION.isApiKey,
    isStatistics: overrides.isStatistics ?? DEFAULT_API_REGISTRATION.isStatistics,
    requiresAuth: overrides.requiresAuth ?? DEFAULT_API_REGISTRATION.requiresAuth,
    rateLimitPerMinute: overrides.rateLimitPerMinute ?? DEFAULT_API_REGISTRATION.rateLimitPerMinute,
    rateLimitPerHour: overrides.rateLimitPerHour ?? DEFAULT_API_REGISTRATION.rateLimitPerHour,
    dailyQuota: overrides.dailyQuota ?? DEFAULT_API_REGISTRATION.dailyQuota,
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
