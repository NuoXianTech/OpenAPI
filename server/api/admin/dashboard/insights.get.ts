import type { H3Event } from 'h3'
import { getQuery } from 'h3'
import { adminLogsService } from '~~/server/services/admin-logs-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readQueryNumber } from '~~/server/utils/request-query'

export default defineAdminEventHandler(async (event: H3Event) => {
  const query = getQuery(event)
  return adminLogsService.getDashboardInsights({
    rankingLimit: readQueryNumber(query.ranking)
  })
})
