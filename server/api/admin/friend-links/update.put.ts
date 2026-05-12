import type { H3Event } from 'h3'
import { adminUpdateFriendLinkSchema } from '#shared/schemas/admin'
import { friendLinkService } from '~~/server/service/friendLinkService'
import { requireAdmin } from '~~/server/utils/auth'
import { operationLogService } from '~~/server/service/operationLogService'
import { readZodBody } from '~~/server/utils/zod'

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const { id, title, url, description, isActive } = await readZodBody(event, adminUpdateFriendLinkSchema)

  const updated = await friendLinkService.update(id, {
    title,
    url,
    description: description?.trim() || null,
    isActive
  })

  await operationLogService.addLog({
    userId: admin.id || null,
    actor: admin.username,
    action: 'admin.friend-link.update',
    resourceType: 'friend-link',
    resourceId: String(id),
    detail: { updated }
  })

  return updated
})
