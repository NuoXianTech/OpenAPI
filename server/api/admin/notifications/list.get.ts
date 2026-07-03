import type { H3Event } from 'h3'
import { notificationService } from '~~/server/services/notification-service'
import { requireAdmin } from '~~/server/utils/auth'
import { readPaginationQuery } from '~~/server/utils/request-pagination'

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)
  const { limit, offset } = readPaginationQuery(event)

  const data = await notificationService.listMessagesForAdmin({ limit, offset })
  return data
})
