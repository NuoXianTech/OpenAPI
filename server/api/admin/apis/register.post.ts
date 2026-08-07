/**
 * Admin · 一键从 manifest 登记 / 重新同步一个 (pathVersion, code)。
 *
 * - 从 manifest 查 endpointCount / 推断 apiPath / httpMethod
 * - 已存在则刷新 manifest 投影字段（apiPath/httpMethod/endpointCount），治理字段保留
 * - 不存在则使用 DEFAULT_API_REGISTRATION + overrides 入库
 */

import { createError } from 'h3'
import { adminRegisterApiSchema } from '~~/server/schemas/admin'
import { API_MANIFEST } from '#api-manifest'
import { DEFAULT_API_REGISTRATION, hasAnyChargedMethod } from '~~/server/config/api-guard'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { apiService } from '~~/server/services/api-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { readZodBody } from '~~/server/utils/zod'
import type { ManifestEndpoint } from '~~/server/types/api-guard'

export default defineAdminEventHandler(async (event, admin) => {
  const { pathVersion, code, overrides } = await readZodBody(event, adminRegisterApiSchema)

  const manifestApi = API_MANIFEST.find(a => a.pathVersion === pathVersion && a.code === code)
  if (!manifestApi) {
    throw createError({
      statusCode: 404,
      message: `manifest 中不存在 ${pathVersion}/${code}，请确认对应文件已创建并重启 dev 服务`
    })
  }

  const methods = Array.from(new Set(manifestApi.endpoints.map((e: ManifestEndpoint) => e.method))).filter(m => m !== 'ANY')
  const httpMethod = methods.length > 0 ? methods.join(',') : 'GET'
  const baseEp = manifestApi.endpoints.find((e: ManifestEndpoint) => e.paramNames.length === 0) || manifestApi.endpoints[0]!
  const apiPath = baseEp.apiPath.replace(/\/:[^/]+$/, '') || `/${pathVersion}/${code}`

  const o = overrides || {}
  const defaults = {
    name: o.name || code,
    shortDesc: o.shortDesc || `${pathVersion} ${code}`,
    description: o.description || `自动登记于 ${pathVersion}/${code}`,
    docUrl: o.docUrl || '',
    status: typeof o.status === 'number' ? o.status : DEFAULT_API_REGISTRATION.status,
    categoryId: o.categoryId === undefined ? null : o.categoryId,
    isEnabled: o.isEnabled ?? DEFAULT_API_REGISTRATION.isEnabled,
    isApiKey: o.isApiKey ?? DEFAULT_API_REGISTRATION.isApiKey,
    isStatistics: o.isStatistics ?? DEFAULT_API_REGISTRATION.isStatistics,
    rateLimitPerSecond: o.rateLimitPerSecond ?? DEFAULT_API_REGISTRATION.rateLimitPerSecond,
    rateLimitPerMinute: o.rateLimitPerMinute ?? DEFAULT_API_REGISTRATION.rateLimitPerMinute,
    rateLimitPerHour: o.rateLimitPerHour ?? DEFAULT_API_REGISTRATION.rateLimitPerHour,
    rateLimitPerDay: o.rateLimitPerDay ?? DEFAULT_API_REGISTRATION.rateLimitPerDay,
    dailyQuota: o.dailyQuota ?? DEFAULT_API_REGISTRATION.dailyQuota,
    methodCosts: (o.methodCosts ?? DEFAULT_API_REGISTRATION.methodCosts) as Record<string, number>,
    timeoutMs: o.timeoutMs ?? DEFAULT_API_REGISTRATION.timeoutMs
  }

  // 计费一致性：methodCosts 中存在 > 0 的方法时必须搭配 isApiKey=true
  if (hasAnyChargedMethod(defaults.methodCosts) && !defaults.isApiKey) {
    throw createError({
      statusCode: 400,
      message: '设置扣费金额时必须开启「API密钥」'
    })
  }
  if (defaults.isStatistics && !defaults.isEnabled) {
    throw createError({
      statusCode: 400,
      message: '启用统计前必须先启用接口'
    })
  }

  const saved = await apiService.registerFromManifest({
    pathVersion,
    code,
    apiPath,
    httpMethod,
    endpointCount: manifestApi.endpoints.length,
    createdBy: admin.id,
    defaults
  })

  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.api.register',
    resourceType: 'api',
    resourceId: saved?.id ?? null,
    detail: { pathVersion, code }
  })

  return saved
})
