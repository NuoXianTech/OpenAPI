import type { H3Event } from 'h3'
import { userCreateApiKeySchema } from '#shared/schemas/user'
import { apiKeyService } from '~~/server/services/api-key-service'
import { requireAuth } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineEventHandler(async (event: H3Event) => {
  const user = await requireAuth(event)
  const input = await readZodBody(event, userCreateApiKeySchema)

  const created = await apiKeyService.createForUser(user.id, {
    name: input.name || '默认密钥',
    expiresAt: input.expiresAt ?? null,
    totalQuota: input.totalQuota ?? null,
    scopes: input.scopes ?? null,
    ipWhitelist: input.ipWhitelist ?? null,
    count: input.count
  })

  return { keys: created, count: created.length }
})
