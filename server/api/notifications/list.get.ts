import type { H3Event } from 'h3'
import { notificationService } from '~~/server/services/notification-service'
import { requireAuth } from '~~/server/utils/auth'
import { readPaginationQuery } from '~~/server/utils/request-pagination'

export default defineEventHandler(async (event: H3Event) => {
  const user = await requireAuth(event)
  const { query, limit, offset } = readPaginationQuery(event)
  const onlyUnread = query.unread === '1' || query.unread === 'true'

  const data = await notificationService.listForUser(user.id, { limit, offset, onlyUnread })
  return data
})
