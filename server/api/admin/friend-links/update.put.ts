import { createError } from 'h3'
import { adminUpdateFriendLinkSchema } from '~~/server/schemas/admin'
import { friendLinkService } from '~~/server/services/friend-link-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event, admin) => {
  const { id, title, url, description, isActive } = await readZodBody(event, adminUpdateFriendLinkSchema)

  const updated = await friendLinkService.update(id, {
    title,
    url,
    description: description?.trim() || null,
    isActive
  })
  if (!updated) {
    throw createError({ statusCode: 404, message: 'friend link not found' })
  }

  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.friend-link.update',
    resourceType: 'friend-link',
    resourceId: id,
    detail: { updated }
  })

  return updated
})
