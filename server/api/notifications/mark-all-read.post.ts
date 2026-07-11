import type { H3Event } from 'h3'
import { notificationService } from '~~/server/services/notification-service'
import { defineAuthenticatedEventHandler } from '~~/server/utils/auth'

export default defineAuthenticatedEventHandler(async (event: H3Event, user) => {
  const updated = await notificationService.markAllRead(user.id)
  return { updated }
})
