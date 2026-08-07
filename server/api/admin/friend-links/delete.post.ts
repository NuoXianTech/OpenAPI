import { createError } from 'h3'
import { idSchema } from '~~/server/schemas/common'
import { friendLinkService } from '~~/server/services/friend-link-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event, admin) => {
  const { id } = await readZodBody(event, idSchema)

  const deleted = await friendLinkService.delete(id)
  if (!deleted) {
    throw createError({ statusCode: 404, message: 'friend link not found' })
  }

  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.friend-link.delete',
    resourceType: 'friend-link',
    resourceId: id,
    detail: { deleted }
  })

  return deleted
})
