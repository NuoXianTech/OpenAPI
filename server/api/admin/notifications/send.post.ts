import type { H3Event } from 'h3'
import { createError } from 'h3'
import { adminSendNotificationSchema } from '#shared/schemas/admin'
import { notificationService } from '~~/server/service/notificationService'
import { operationLogService } from '~~/server/service/operationLogService'
import { requireAdmin } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const body = await readZodBody(event, adminSendNotificationSchema)
  const { title, content } = body
  const audience = body.audience ?? 'specific'
  const level = body.level ?? 'info'

  if (audience === 'specific' && (!body.recipientUserIds || body.recipientUserIds.length === 0)) {
    throw createError({ statusCode: 400, message: '请选择至少一个收件人或改为全员发送' })
  }

  const result = await notificationService.send({
    audience,
    recipientUserIds: body.recipientUserIds,
    title,
    content,
    level,
    linkUrl: body.linkUrl?.trim() || null,
    senderUserId: admin.id || null,
    senderActor: admin.username
  })

  await operationLogService.addLog({
    actor: admin.username,
    action: 'admin.notification.send',
    resourceType: 'notification-message',
    resourceId: String(result.message.id),
    detail: {
      title,
      level,
      audience,
      deliveredCount: result.deliveredCount
    }
  })

  return result
})
