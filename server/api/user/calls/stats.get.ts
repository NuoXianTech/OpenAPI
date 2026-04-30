import type { H3Event } from 'h3'
import { createError } from 'h3'
import { apiCallService } from '~~/server/service/apiCallService'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  const user = await requireAuth(event)
  if (!user.id) {
    throw createError({ statusCode: 403, message: 'admin cannot access user call stats' })
  }

  const [summary, byApi, recent] = await Promise.all([
    apiCallService.getSummaryForUser(user.id),
    apiCallService.listAggregatedByUser(user.id, 100),
    apiCallService.listRecentForUser(user.id, 50),
  ])

  return {
    code: 0,
    msg: 'ok',
    data: {
      summary,
      byApi,
      recent,
    },
  }
})
