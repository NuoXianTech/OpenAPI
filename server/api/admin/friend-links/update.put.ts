import { adminUpdateFriendLinkSchema } from '~~/server/schemas/admin'
import { friendLinkService } from '~~/server/services/friend-link-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { operationLogService } from '~~/server/services/operation-log-service'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event, admin) => {
  const { id, title, url, description, isActive } = await readZodBody(event, adminUpdateFriendLinkSchema)

  const updated = await friendLinkService.update(id, {
    title,
    url,
    description: description?.trim() || null,
    isActive
  })

  await operationLogService.addRequestLog(event, {
    userId: admin.id || null,
    actor: admin.username,
    action: 'admin.friend-link.update',
    resourceType: 'friend-link',
    resourceId: id,
    detail: { updated }
  })

  return updated
})
