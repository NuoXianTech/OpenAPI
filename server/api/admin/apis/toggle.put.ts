import { createError } from 'h3'
import { adminToggleApiSchema } from '~~/server/schemas/admin'
import { apiService } from '~~/server/services/api-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event, admin) => {
  const { id, field, value } = await readZodBody(event, adminToggleApiSchema)

  const updated = await apiService.toggleApiField(id, field, value, admin.id)
    .catch((err: unknown) => {
      throw createError({ statusCode: 400, message: err instanceof Error ? err.message : 'api toggle failed' })
    })

  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: `admin.api.toggle.${field}`,
    resourceType: 'api',
    resourceId: id,
    detail: { updated }
  })

  return updated
})
