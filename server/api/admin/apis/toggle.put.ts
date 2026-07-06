import { createError } from 'h3'
import type { H3Event } from 'h3'
import { adminToggleApiSchema } from '~~/server/schemas/admin'
import { apiService } from '~~/server/services/api-service'
import { requireAdmin } from '~~/server/utils/auth'
import { operationLogService } from '~~/server/services/operation-log-service'
import { readZodBody } from '~~/server/utils/zod'

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const { id, field, value } = await readZodBody(event, adminToggleApiSchema)

  const updated = await apiService.toggleApiField(id, field, value, admin.id || null)
    .catch((err: unknown) => {
      throw createError({ statusCode: 400, message: err instanceof Error ? err.message : 'api toggle failed' })
    })

  await operationLogService.addLog({
    userId: admin.id || null,
    actor: admin.username,
    action: `admin.api.toggle.${field}`,
    resourceType: 'api',
    resourceId: String(id),
    detail: { updated }
  })

  return updated
})
