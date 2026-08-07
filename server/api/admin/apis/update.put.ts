import { createError } from 'h3'
import { adminUpdateApiSchema } from '~~/server/schemas/admin'
import { hasAnyChargedMethod } from '~~/server/config/api-guard'
import { apiService } from '~~/server/services/api-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { readZodBody } from '~~/server/utils/zod'

/**
 * Admin · 编辑已登记 API 的治理字段。
 *
 * 注意：code/pathVersion/apiPath/httpMethod/endpointCount 由 manifest 注入，
 * 不接受外部修改。要修改路径或方法，请改文件后重新登记。
 */
export default defineAdminEventHandler(async (event, admin) => {
  const body = await readZodBody(event, adminUpdateApiSchema)
  const { id, methodCosts, isApiKey } = body

  // 计费一致性校验：methodCosts 中存在 > 0 的方法时必须搭配 isApiKey=true
  // 仅对显式给出的字段做校验；未传字段需结合数据库现状（在 service 层兜底）
  if (methodCosts !== undefined && hasAnyChargedMethod(methodCosts) && isApiKey === false) {
    throw createError({
      statusCode: 400,
      message: '设置扣费金额时必须开启「API密钥」'
    })
  }

  const updated = await apiService.updateApi(id, admin.id, {
    name: body.name,
    status: body.status,
    categoryId: body.categoryId,
    shortDesc: body.shortDesc,
    description: body.description,
    docUrl: body.docUrl,
    isEnabled: body.isEnabled,
    isApiKey,
    isStatistics: body.isStatistics,
    rateLimitPerSecond: body.rateLimitPerSecond,
    rateLimitPerMinute: body.rateLimitPerMinute,
    rateLimitPerHour: body.rateLimitPerHour,
    rateLimitPerDay: body.rateLimitPerDay,
    dailyQuota: body.dailyQuota,
    methodCosts,
    timeoutMs: body.timeoutMs
  }).catch((err: unknown) => {
    throw createError({ statusCode: 400, message: err instanceof Error ? err.message : 'api update failed' })
  })

  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.api.update',
    resourceType: 'api',
    resourceId: id,
    detail: { updated }
  })

  return updated
})
