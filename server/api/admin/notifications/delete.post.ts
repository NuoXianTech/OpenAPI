import type { H3Event } from 'h3'
import { createError, readBody } from 'h3'
import { notificationService } from '~~/server/service/notificationService'
import { operationLogService } from '~~/server/service/operationLogService'
import { requireAdmin } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const body = await readBody(event) as Record<string, unknown>
  const messageId = Number(body.messageId)
  if (!messageId) throw createError({ statusCode: 400, message: 'messageId is required' })

  const removed = await notificationService.softDeleteMessage(messageId)
  if (!removed) throw createError({ statusCode: 404, message: 'message not found' })

  await operationLogService.addLog({
    actor: admin.username,
    actorType: 'admin',
    action: 'admin.notification.delete',
    resourceType: 'notification_message',
    resourceId: String(messageId),
    detail: { title: removed.title },
  })

  return { code: 0, msg: 'ok', data: removed }
})
