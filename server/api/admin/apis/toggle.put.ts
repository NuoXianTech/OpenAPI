import { createError } from 'h3'
import { adminToggleApiSchema } from '~~/server/schemas/admin'
import { apiRegistryService } from '~~/server/services/api-registry-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event, admin) => {
  const { id, field, value } = await readZodBody(event, adminToggleApiSchema)

  const updated = await apiRegistryService.toggleApiField(id, field, value, admin.id)
  if (!updated) {
    throw createError({ statusCode: 404, message: 'API 不存在' })
  }

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
