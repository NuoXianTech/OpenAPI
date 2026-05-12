import type { H3Event } from 'h3'
import { adminCreateUserApiKeySchema } from '#shared/schemas/admin'
import { apiKeyService } from '~~/server/service/apiKeyService'
import { requireAdmin } from '~~/server/utils/auth'
import { operationLogService } from '~~/server/service/operationLogService'
import { readZodBody } from '~~/server/utils/zod'

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const { userId, name } = await readZodBody(event, adminCreateUserApiKeySchema)

  const created = await apiKeyService.createForUser(userId, name || '默认密钥')

  await operationLogService.addLog({
    userId: admin.id || null,
    actor: admin.username,
    action: 'admin.apikey.create',
    resourceType: 'apikey',
    resourceId: String(created.id),
    detail: { created }
  })

  return created
})
