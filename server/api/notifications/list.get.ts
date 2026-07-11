import type { H3Event } from 'h3'
import { notificationService } from '~~/server/services/notification-service'
import { defineAuthenticatedEventHandler } from '~~/server/utils/auth'
import { readPaginationQuery } from '~~/server/utils/pagination'
import { readQueryString } from '~~/server/utils/request-query'

export default defineAuthenticatedEventHandler(async (event: H3Event, user) => {
  const { query, limit, offset } = readPaginationQuery(event)
  const unread = readQueryString(query.unread).trim().toLowerCase()
  const onlyUnread = unread === '1' || unread === 'true'

  const data = await notificationService.listForUser(user.id, { limit, offset, onlyUnread })
  return data
})
