import type { H3Event } from 'h3'
import { adminToggleApiSchema } from '#shared/schemas/admin'
import { apiService } from '~~/server/service/apiService'
import { requireAdmin } from '~~/server/utils/auth'
import { operationLogService } from '~~/server/service/operationLogService'
import { readZodBody } from '~~/server/utils/zod'

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const { id, field, value } = await readZodBody(event, adminToggleApiSchema)

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
