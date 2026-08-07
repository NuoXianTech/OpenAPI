import { userCreateApiKeySchema } from '~~/server/schemas/user'
import { apiKeyService } from '~~/server/services/api-key-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { defineAuthenticatedEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineAuthenticatedEventHandler(async (event, user) => {
  const input = await readZodBody(event, userCreateApiKeySchema)

  const created = await apiKeyService.createForUser(user.id, input)

  await addRequestOperationLog(event, {
    userId: user.id,
    actor: user.username,
    action: 'user.api-key.create',
    resourceType: 'api-key',
    resourceId: created.map(key => key.id).join(','),
    detail: {
      keyIds: created.map(key => key.id),
      keyNames: created.map(key => key.name),
      count: created.length
    }
  })

  return { keys: created, count: created.length }
})
