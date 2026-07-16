import { notificationService } from '~~/server/services/notification-service'
import { defineAuthenticatedEventHandler } from '~~/server/utils/auth'

export default defineAuthenticatedEventHandler(async (_event, user) => {
  const updated = await notificationService.markAllRead(user.id)
  return { updated }
})
