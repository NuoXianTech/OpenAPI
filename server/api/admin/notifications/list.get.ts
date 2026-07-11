import type { H3Event } from 'h3'
import { notificationService } from '~~/server/services/notification-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readPaginationQuery } from '~~/server/utils/pagination'

export default defineAdminEventHandler((event: H3Event) => {
  const { limit, offset } = readPaginationQuery(event)

  return notificationService.listMessagesForAdmin({ limit, offset })
})
