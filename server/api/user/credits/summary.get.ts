import type { H3Event } from 'h3'
import { creditService } from '~~/server/services/credit-service'
import { defineAuthenticatedEventHandler } from '~~/server/utils/auth'

export default defineAuthenticatedEventHandler((event: H3Event, user) => {
  return creditService.getUserCreditsSummary(user.id)
})
