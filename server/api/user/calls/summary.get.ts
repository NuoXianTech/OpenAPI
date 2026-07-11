import type { H3Event } from 'h3'
import { apiCallService } from '~~/server/services/api-call-service'
import { defineAuthenticatedEventHandler } from '~~/server/utils/auth'

export default defineAuthenticatedEventHandler(async (event: H3Event, user) => {
  const data = await apiCallService.getSummaryForUser(user.id)
  return data
})
