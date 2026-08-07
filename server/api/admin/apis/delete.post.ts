import { createError } from 'h3'
import { idSchema } from '~~/server/schemas/common'
import { apiRegistryService } from '~~/server/services/api-registry-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event, admin) => {
  const { id } = await readZodBody(event, idSchema)

  const deleted = await apiRegistryService.deleteApi(id)
  if (!deleted) {
    throw createError({ statusCode: 404, message: 'api not found' })
  }

  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.api.delete',
    resourceType: 'api',
    resourceId: id,
    detail: { deleted }
  })

  return deleted
})
