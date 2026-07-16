import { notificationService } from '~~/server/services/notification-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readPaginationQuery } from '~~/server/utils/pagination'

export default defineAdminEventHandler((event) => {
  const { limit, offset } = readPaginationQuery(event)

  return notificationService.listMessagesForAdmin({ limit, offset })
})
