import { creditService } from '~~/server/services/credit-service'
import { defineAuthenticatedEventHandler } from '~~/server/utils/auth'

export default defineAuthenticatedEventHandler((_event, user) => creditService.getUserCreditsSummary(user.id))
