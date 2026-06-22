import type { H3Event } from 'h3'
import { getQuery } from 'h3'
import { notificationService } from '~~/server/service/notificationService'
import { requireAuth } from '~~/server/utils/auth'
import { parsePaginationQuery } from '~~/server/utils/pagination'

export default defineEventHandler(async (event: H3Event) => {
  const user = await requireAuth(event)
  const query = getQuery(event)
  const { limit, offset } = parsePaginationQuery(query)
  const onlyUnread = query.unread === '1' || query.unread === 'true'

  const data = await notificationService.listForUser(user.id, { limit, offset, onlyUnread })
  return data
})
