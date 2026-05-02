import type { H3Event } from 'h3'
import { createError } from 'h3'
import { apiService } from '~~/server/service/apiService'
import { requireAdmin } from '~~/server/utils/auth'
import { operationLogService } from '~~/server/service/operationLogService'

/**
 * Admin · 编辑已登记 API 的治理字段。
 *
 * 注意：code/pathVersion/apiPath/httpMethod/sourceDir/endpointCount 由 manifest 注入，
 * 不接受外部修改。要修改路径或方法，请改文件后重新登记。
 */
export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const body = await readBody(event) as Record<string, any>
  const id = Number(body.id)
  if (!id) {
    throw createError({ statusCode: 400, message: 'id is required' })
  }

  // 计费一致性校验：costCredits>0 必须搭配 isApiKey=true
  // 仅对显式给出的字段做校验；未传字段需结合数据库现状（在 service 层兜底）
  const costCredits = body.costCredits !== undefined ? Number(body.costCredits) : undefined
  const isApiKey = typeof body.isApiKey === 'boolean' ? body.isApiKey : undefined
  if (costCredits !== undefined && costCredits > 0 && isApiKey === false) {
    throw createError({
      statusCode: 400,
      message: '设置扣费金额时必须开启「必需 API Key」',
    })
  }

  const updated = await apiService.updateApi(id, admin.id || null, {
    name: body.name?.toString().trim(),
    status: body.status !== undefined ? Number(body.status) : undefined,
    categoryId: body.categoryId !== undefined
      ? (body.categoryId === null || body.categoryId === '' ? null : Number(body.categoryId))
      : undefined,
    shortDesc: body.shortDesc?.toString().trim(),
    description: body.description?.toString().trim(),
    docUrl: body.docUrl?.toString().trim(),
    isEnabled: typeof body.isEnabled === 'boolean' ? body.isEnabled : undefined,
    isApiKey,
    isStatistics: typeof body.isStatistics === 'boolean' ? body.isStatistics : undefined,
    rateLimitPerSecond: body.rateLimitPerSecond !== undefined ? Number(body.rateLimitPerSecond) : undefined,
    rateLimitPerMinute: body.rateLimitPerMinute !== undefined ? Number(body.rateLimitPerMinute) : undefined,
    rateLimitPerHour: body.rateLimitPerHour !== undefined ? Number(body.rateLimitPerHour) : undefined,
    rateLimitPerDay: body.rateLimitPerDay !== undefined ? Number(body.rateLimitPerDay) : undefined,
    dailyQuota: body.dailyQuota !== undefined ? Number(body.dailyQuota) : undefined,
    costCredits,
    timeoutMs: body.timeoutMs !== undefined ? Number(body.timeoutMs) : undefined,
  })

  await operationLogService.addLog({
    userId: admin.id || null,
    actor: admin.username,
    action: 'admin.api.update',
    resourceType: 'api',
    resourceId: String(id),
    detail: { updated },
  })

  return { code: 0, msg: 'ok', data: updated }
})
