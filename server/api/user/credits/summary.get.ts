import { creditService } from '~~/server/services/credit-service'
import { defineAuthenticatedEventHandler } from '~~/server/utils/auth'

export default defineAuthenticatedEventHandler((_event, user) => {
  return creditService.getUserCreditsSummary(user.id)
})
