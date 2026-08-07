import { adminCreateUserApiKeySchema } from '~~/server/schemas/admin'
import { apiKeyService } from '~~/server/services/api-key-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event, admin) => {
  const input = await readZodBody(event, adminCreateUserApiKeySchema)
  const { userId, ...payload } = input

  const created = await apiKeyService.createForUser(userId, payload)

  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.api-key.create',
    resourceType: 'api-key',
    resourceId: created.map(k => k.id).join(','),
    detail: { keyIds: created.map(key => key.id), count: created.length }
  })

  return { keys: created, count: created.length }
})
