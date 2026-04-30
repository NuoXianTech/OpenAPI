import type { H3Event } from 'h3'
import { getQuery } from 'h3'
import { notificationService } from '~~/server/service/notificationService'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  const user = await requireAuth(event)
  const query = getQuery(event)
  const limit = query.limit ? Number(query.limit) : 50
  const offset = query.offset ? Number(query.offset) : 0
  const onlyUnread = query.unread === '1' || query.unread === 'true'

  const data = await notificationService.listForUser(user.id, { limit, offset, onlyUnread })
  return { code: 0, msg: 'ok', data }
})
