import type { H3Event } from 'h3'
import { createError, readBody } from 'h3'
import { notificationService, type NotificationLevel } from '~~/server/service/notificationService'
import { usersService } from '~~/server/service/userService'
import { operationLogService } from '~~/server/service/operationLogService'
import { requireAdmin } from '~~/server/utils/auth'

const VALID_LEVELS: NotificationLevel[] = ['info', 'success', 'warning', 'critical']

interface SendBody {
  /** 收件人列表；与 broadcast=true 互斥 */
  recipientUserIds?: number[]
  /** 群发开关：true 时忽略 recipientUserIds，发送给所有未删除用户 */
  broadcast?: boolean
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
  if (!title || !content) {
    throw createError({ statusCode: 400, message: 'title 与 content 必填' })
  }
  if (title.length > 200) {
    throw createError({ statusCode: 400, message: 'title 过长（最多 200 字）' })
  }

  const level: NotificationLevel = VALID_LEVELS.includes(body.level as NotificationLevel)
    ? body.level as NotificationLevel
    : 'info'

  let recipientIds: number[] = []
  if (body.broadcast) {
    const allUsers = await usersService.list()
    recipientIds = allUsers
      .filter(u => !u.deletedAt && !u.isBanned)
      .map(u => u.id)
  }
  else {
    const raw = Array.isArray(body.recipientUserIds) ? body.recipientUserIds : []
    const cleaned = Array.from(new Set(raw.map(Number).filter(n => Number.isFinite(n) && n > 0)))
    if (cleaned.length === 0) {
      throw createError({ statusCode: 400, message: '请选择至少一个收件人或开启广播' })
    }
    recipientIds = await notificationService.filterValidUserIds(cleaned)
    if (recipientIds.length === 0) {
      throw createError({ statusCode: 400, message: '所选用户均不存在或已删除' })
    }
  }

  const result = await notificationService.send({
    recipientUserIds: recipientIds,
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
    resourceType: 'notification',
    resourceId: result.batchId || '',
    detail: {
      title,
      level,
      recipientCount: result.inserted,
      broadcast: !!body.broadcast,
    },
  })

  return { code: 0, msg: 'ok', data: result }
})
