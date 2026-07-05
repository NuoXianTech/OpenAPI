import { getQuery } from 'h3'
import { apiCallStatsService } from '~~/server/services/api-call-stats-service'
import { readQueryNumber } from '~~/server/utils/request-query'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const days = readQueryNumber(query.days) ?? 7
  const topLimit = readQueryNumber(query.top) ?? 10

  return apiCallStatsService.getPublicDashboard({
    days,
    topLimit
  })
})
