import type { H3Event } from 'h3'
import { getQuery } from 'h3'
import { notificationService } from '~~/server/service/notificationService'
import { requireAdmin } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)
  const query = getQuery(event)
  const limit = query.limit ? Number(query.limit) : 50
  const offset = query.offset ? Number(query.offset) : 0

  const data = await notificationService.listBatchesForAdmin({ limit, offset })
  return { code: 0, msg: 'ok', data }
})
