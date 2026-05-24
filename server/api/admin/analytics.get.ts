import type { H3Event } from 'h3'
import { getQuery } from 'h3'
import { adminLogsService } from '~~/server/service/adminLogsService'
import { requireAdmin } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)
  const query = getQuery(event)
  const data = await adminLogsService.getAnalytics({
    topLimit: query.top ? Number(query.top) : undefined,
    averageWindowDays: query.window ? Number(query.window) : undefined
  })
  return data
})
