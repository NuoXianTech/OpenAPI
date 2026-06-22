import type { H3Event } from 'h3'
import { getQuery } from 'h3'
import { notificationService } from '~~/server/service/notificationService'
import { requireAdmin } from '~~/server/utils/auth'
import { parsePaginationQuery } from '~~/server/utils/pagination'

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)
  const query = getQuery(event)
  const { limit, offset } = parsePaginationQuery(query)

  const data = await notificationService.listMessagesForAdmin({ limit, offset })
  return data
})
