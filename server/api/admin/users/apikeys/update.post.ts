import { createError } from 'h3'
import { adminUpdateUserApiKeySchema } from '~~/server/schemas/admin'
import { apiKeyService } from '~~/server/services/api-key-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event, admin) => {
  const input = await readZodBody(event, adminUpdateUserApiKeySchema)
  const { id, ...patch } = input

  const updated = await apiKeyService.updateConfig(id, patch)

  if (!updated) {
    throw createError({ statusCode: 404, message: 'API Key 不存在' })
  }

  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.api-key.update',
    resourceType: 'api-key',
    resourceId: updated.id,
    detail: { patch }
  })

  return updated
})
