import type { H3Event } from 'h3'
import { createError } from 'h3'
import { messageIdSchema } from '#shared/schemas/common'
import { notificationService } from '~~/server/services/notification-service'
import { operationLogService } from '~~/server/services/operation-log-service'
import { requireAdmin } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const { messageId } = await readZodBody(event, messageIdSchema)

  const removed = await notificationService.softDeleteMessage(messageId)
  if (!removed) throw createError({ statusCode: 404, message: 'message not found' })

  await operationLogService.addLog({
    actor: admin.username,
    action: 'admin.notification.delete',
    resourceType: 'notification-message',
    resourceId: String(messageId),
    detail: { title: removed.title }
  })

  return removed
})
