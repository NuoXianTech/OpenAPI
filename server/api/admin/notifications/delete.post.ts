import { createError } from 'h3'
import { messageIdSchema } from '~~/server/schemas/common'
import { notificationService } from '~~/server/services/notification-service'
import { operationLogService } from '~~/server/services/operation-log-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event, admin) => {
  const { messageId } = await readZodBody(event, messageIdSchema)

  const removed = await notificationService.softDeleteMessage(messageId)
  if (!removed) throw createError({ statusCode: 404, message: 'message not found' })

  await operationLogService.addRequestLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.notification.delete',
    resourceType: 'notification-message',
    resourceId: String(messageId),
    detail: { title: removed.title }
  })

  return removed
})
