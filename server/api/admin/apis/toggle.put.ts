import type { H3Event } from 'h3'
import { createError } from 'h3'
import { apiService } from '~~/server/service/apiService'
import { requireAdmin } from '~~/server/utils/auth'
import { operationLogService } from '~~/server/service/operationLogService'

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const body = await readBody(event) as Record<string, any>
  const id = Number(body.id)
  const field = body.field as 'isEnabled' | 'isStatistics'
  const value = Boolean(body.value)

  if (!id || !['isEnabled', 'isStatistics'].includes(field)) {
    throw createError({ statusCode: 400, message: 'invalid parameters' })
  }

  const updated = await apiService.toggleApiField(id, field, value, admin.id || null)

  await operationLogService.addLog({
    userId: admin.id || null,
    actor: admin.username,
    action: `admin.api.toggle.${field}`,
    resourceType: 'api',
    resourceId: String(id),
    detail: { updated },
  })

  return updated
})
