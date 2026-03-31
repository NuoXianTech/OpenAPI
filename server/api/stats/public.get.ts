import { getQuery } from 'h3'
import type { PublicCallStatsResponse } from '~~/shared/types/public-stats'
import { apiCallStatsService } from '~~/server/service/apiCallStatsService'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const days = Number(query.days || 7)
  const topLimit = Number(query.top || 10)

  const data = await apiCallStatsService.getPublicDashboard({
    days,
    topLimit,
  })

  const response: PublicCallStatsResponse = {
    code: 0,
    msg: 'ok',
    data,
    timestamp: Date.now(),
  }

  return response
})
