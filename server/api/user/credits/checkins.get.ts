import { createError, getQuery } from 'h3'
import { checkinService } from '~~/server/services/checkin-service'
import { defineAuthenticatedEventHandler } from '~~/server/utils/auth'
import { getLocalMonthRange } from '~~/server/utils/local-time'
import { readQueryString } from '~~/server/utils/request-query'

export default defineAuthenticatedEventHandler((event, user) => {
  const month = readQueryString(getQuery(event).month)
  const range = getLocalMonthRange(month)
  if (!range) {
    throw createError({ statusCode: 400, message: '月份格式必须为 YYYY-MM' })
  }

  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  return checkinService.getMonthlyHistory(user.id, range)
})
