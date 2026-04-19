import { getQuery, getHeader, getRequestIP } from 'h3'
import type { PublicCallStatsResponse } from '~~/shared/types/public-stats'
import { apiCallStatsService } from '~~/server/service/apiCallStatsService'
import { assertTurnstileForPage } from '~~/server/utils/turnstile'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const days = Number(query.days || 7)
  const topLimit = Number(query.top || 10)

  // 公开统计页面的人机验证：token 可通过 query 或 header 传递
  const token = (query.turnstileToken || getHeader(event, 'x-turnstile-token') || '').toString()
  await assertTurnstileForPage('publicStats', token, getRequestIP(event) || null)

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
