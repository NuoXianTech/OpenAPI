import { getQuery } from 'h3'
import { adminLogsService } from '~~/server/services/admin-logs-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readQueryNumber } from '~~/server/utils/request-query'

export default defineAdminEventHandler((event) => {
  const query = getQuery(event)
  return adminLogsService.getDashboardInsights({
    rankingLimit: readQueryNumber(query.ranking)
  })
})
