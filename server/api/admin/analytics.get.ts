import type { H3Event } from 'h3'
import { getQuery } from 'h3'
import { adminLogsService } from '~~/server/services/admin-logs-service'
import { requireAdmin } from '~~/server/utils/auth'
import { readQueryNumber } from '~~/server/utils/request-query'

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)
  const query = getQuery(event)
  const data = await adminLogsService.getAnalytics({
    topLimit: readQueryNumber(query.top),
    averageWindowDays: readQueryNumber(query.window)
  })
  return data
})
