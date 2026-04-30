import type { H3Event } from 'h3'
import { notificationService } from '~~/server/service/notificationService'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  const user = await requireAuth(event)
  const updated = await notificationService.markAllRead(user.id)
  return { code: 0, msg: 'ok', data: { updated } }
})
