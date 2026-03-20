import type { H3Event } from 'h3'
import { createError } from 'h3'
import { apiService } from '~~/server/service/apiService'
import { requireAdmin } from '~~/server/utils/auth'
import { operationLogService } from '~~/server/service/operationLogService'

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const body = await readBody(event) as Record<string, any>
  const required = ['apiId', 'name', 'shortDesc', 'description', 'httpMethod', 'apiPath', 'docUrl']
  for (const key of required) {
    if (!(body[key] || '').toString().trim()) {
      throw createError({ statusCode: 400, message: `${key} is required` })
    }
  }

  const created = await apiService.addApi(admin.id || null, {
    apiId: body.apiId.toString().trim(),
    name: body.name.toString().trim(),
    status: body.status !== undefined ? Number(body.status) : 1,
    category: body.category?.toString().trim() || null,
    shortDesc: body.shortDesc.toString().trim(),
    description: body.description.toString().trim(),
    httpMethod: body.httpMethod.toString().trim(),
    apiPath: body.apiPath.toString().trim(),
    docUrl: body.docUrl.toString().trim(),
    isEnabled: Boolean(body.isEnabled),
    isApiKey: Boolean(body.isApiKey),
    isStatistics: Boolean(body.isStatistics),
    rateLimitPerMinute: body.rateLimitPerMinute !== undefined ? Number(body.rateLimitPerMinute) : 0,
  })

  await operationLogService.addLog({
    userId: admin.id || null,
    actor: admin.username,
    action: 'admin.api.create',
    resourceType: 'api',
    resourceId: String(created[0]?.id || ''),
    detail: JSON.stringify(created[0] || created),
  })

  return { code: 0, msg: 'ok', data: created[0] || created }
})
