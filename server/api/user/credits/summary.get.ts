import type { H3Event } from 'h3'
import { creditService } from '~~/server/services/credit-service'
import { defineAuthenticatedEventHandler } from '~~/server/utils/auth'

export default defineAuthenticatedEventHandler(async (event: H3Event, user) => {
  const data = await creditService.getUserCreditsSummary(user.id)
  return data
})
