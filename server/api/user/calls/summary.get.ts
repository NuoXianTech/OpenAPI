import type { H3Event } from 'h3'
import { apiCallService } from '~~/server/services/api-call-service'
import { defineAuthenticatedEventHandler } from '~~/server/utils/auth'

export default defineAuthenticatedEventHandler((event: H3Event, user) => {
  return apiCallService.getSummaryForUser(user.id)
})
