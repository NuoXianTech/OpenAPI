import type { H3Event } from 'h3'
import { requireAdmin } from '~~/server/utils/auth'
import { apiCallStatsService } from '~~/server/service/apiCallStatsService'

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)
  const [list, summary] = await Promise.all([
    apiCallStatsService.list(),
    apiCallStatsService.getSummary()
  ])

  return {
    total: summary.total,
    success: summary.success,
    failure: summary.failure,
    items: list
  }
})
