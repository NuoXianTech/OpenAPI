import type { H3Event } from 'h3'
import { notificationService } from '~~/server/services/notification-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readPaginationQuery } from '~~/server/utils/pagination'

export default defineAdminEventHandler(async (event: H3Event) => {
  const { limit, offset } = readPaginationQuery(event)

  const data = await notificationService.listMessagesForAdmin({ limit, offset })
  return data
})
