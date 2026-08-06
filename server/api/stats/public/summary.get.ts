import { setResponseHeader } from 'h3'
import { apiCallStatsService } from '~~/server/services/api-call-stats-service'

export default defineEventHandler((event) => {
  setResponseHeader(event, 'cache-control', 'public, max-age=0, s-maxage=10, stale-while-revalidate=10')
  return apiCallStatsService.getPublicSummary()
})
