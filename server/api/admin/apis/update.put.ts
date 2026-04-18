import type { H3Event } from 'h3'
import { createError } from 'h3'
import { apiService } from '~~/server/service/apiService'
import { requireAdmin } from '~~/server/utils/auth'
import { operationLogService } from '~~/server/service/operationLogService'

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const body = await readBody(event) as Record<string, any>
  const id = Number(body.id)
  if (!id) {
    throw createError({ statusCode: 400, message: 'id is required' })
  }

  const updated = await apiService.updateApi(id, admin.id || null, {
    code: body.code?.toString().trim(),
    name: body.name?.toString().trim(),
    status: body.status !== undefined ? Number(body.status) : undefined,
    categoryId: body.categoryId !== undefined
      ? (body.categoryId === null || body.categoryId === '' ? null : Number(body.categoryId))
      : undefined,
    shortDesc: body.shortDesc?.toString().trim(),
    description: body.description?.toString().trim(),
    httpMethod: body.httpMethod?.toString().trim(),
    apiPath: body.apiPath?.toString().trim(),
    docUrl: body.docUrl?.toString().trim(),
    isEnabled: typeof body.isEnabled === 'boolean' ? body.isEnabled : undefined,
    isApiKey: typeof body.isApiKey === 'boolean' ? body.isApiKey : undefined,
    isStatistics: typeof body.isStatistics === 'boolean' ? body.isStatistics : undefined,
    rateLimitPerMinute: body.rateLimitPerMinute !== undefined ? Number(body.rateLimitPerMinute) : undefined,
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
