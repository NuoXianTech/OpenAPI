import { userApiCallService } from '~~/server/services/user-api-call-service'
import { defineAuthenticatedEventHandler } from '~~/server/utils/auth'

export default defineAuthenticatedEventHandler((_event, user) => userApiCallService.getSummary(user.id))
