import { notificationService } from '~~/server/services/notification-service'
import { defineAuthenticatedEventHandler } from '~~/server/utils/auth'

export default defineAuthenticatedEventHandler(async (_event, user) => {
  const value = await notificationService.unreadCountForUser(user.id)
  return { count: value }
})
