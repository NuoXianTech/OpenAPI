import type { H3Event } from 'h3'
import { createError } from 'h3'
import { apiService } from '~~/server/service/apiService'
import { requireAdmin } from '~~/server/utils/auth'
import { operationLogService } from '~~/server/service/operationLogService'

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const body = await readBody(event) as Record<string, unknown>
  const id = Number(body.id)
  if (!id) {
    throw createError({ statusCode: 400, message: 'id is required' })
  }

  const deleted = await apiService.deleteApi(id)
  if (!deleted) {
    throw createError({ statusCode: 404, message: 'api not found' })
  }

  await operationLogService.addLog({
    userId: admin.id || null,
    actor: admin.username,
    action: 'admin.api.delete',
    resourceType: 'api',
    resourceId: String(id),
    detail: { deleted },
  })

  return deleted
})
