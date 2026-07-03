import type { H3Event } from 'h3'
import { notificationService } from '~~/server/services/notification-service'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  const user = await requireAuth(event)
  const updated = await notificationService.markAllRead(user.id)
  return { updated }
})
