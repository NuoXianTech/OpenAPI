import type { H3Event } from 'h3'
import { createError, readBody } from 'h3'
import { notificationService, type NotificationAudience, type NotificationLevel } from '~~/server/service/notificationService'
import { operationLogService } from '~~/server/service/operationLogService'
import { requireAdmin } from '~~/server/utils/auth'

const VALID_LEVELS: NotificationLevel[] = ['info', 'success', 'warning', 'critical']
const VALID_AUDIENCES: NotificationAudience[] = ['specific', 'all_current', 'all_with_future']

interface SendBody {
  audience?: NotificationAudience
  recipientUserIds?: number[]
  title?: string
  content?: string
  level?: NotificationLevel
  linkUrl?: string | null
}

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const body = await readBody<SendBody>(event)

  const title = (body.title || '').toString().trim()
  const content = (body.content || '').toString()
  if (!title || !content) throw createError({ statusCode: 400, message: 'title 与 content 必填' })
  if (title.length > 200) throw createError({ statusCode: 400, message: 'title 过长（最多 200 字）' })

  const audience: NotificationAudience = VALID_AUDIENCES.includes(body.audience as NotificationAudience)
    ? body.audience as NotificationAudience
    : 'specific'

  const level: NotificationLevel = VALID_LEVELS.includes(body.level as NotificationLevel)
    ? body.level as NotificationLevel
    : 'info'

  if (audience === 'specific' && (!Array.isArray(body.recipientUserIds) || body.recipientUserIds.length === 0)) {
    throw createError({ statusCode: 400, message: '请选择至少一个收件人或改为全员发送' })
  }

  const result = await notificationService.send({
    audience,
    recipientUserIds: body.recipientUserIds,
    title,
    content,
    level,
    linkUrl: body.linkUrl?.toString().trim() || null,
    senderUserId: admin.id || null,
    senderActor: admin.username,
  })

  await operationLogService.addLog({
    actor: admin.username,
    actorType: 'admin',
    action: 'admin.notification.send',
    resourceType: 'notification_message',
    resourceId: String(result.message.id),
    detail: {
      title,
      level,
      audience,
      deliveredCount: result.deliveredCount,
    },
  })

  return { code: 0, msg: 'ok', data: result }
})
