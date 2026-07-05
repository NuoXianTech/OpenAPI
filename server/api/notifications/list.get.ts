import type { H3Event } from 'h3'
import { notificationService } from '~~/server/services/notification-service'
import { requireAuth } from '~~/server/utils/auth'
import { readPaginationQuery } from '~~/server/utils/request-pagination'
import { readQueryString } from '~~/server/utils/request-query'

export default defineEventHandler(async (event: H3Event) => {
  const user = await requireAuth(event)
  const { query, limit, offset } = readPaginationQuery(event)
  const unread = readQueryString(query.unread).trim().toLowerCase()
  const onlyUnread = unread === '1' || unread === 'true'

  const data = await notificationService.listForUser(user.id, { limit, offset, onlyUnread })
  return data
})
