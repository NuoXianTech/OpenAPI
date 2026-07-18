import { apiCallService } from '~~/server/services/api-call-service'
import { defineAuthenticatedEventHandler } from '~~/server/utils/auth'

export default defineAuthenticatedEventHandler((_event, user) => apiCallService.listFilterOptionsForUser(user.id))
