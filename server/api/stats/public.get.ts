import { getQuery } from 'h3'
import { apiCallStatsService } from '~~/server/services/api-call-stats-service'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const days = Number(query.days || 7)
  const topLimit = Number(query.top || 10)

  return apiCallStatsService.getPublicDashboard({
    days,
    topLimit
  })
})
