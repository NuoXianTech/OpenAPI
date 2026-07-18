import { checkinService } from '~~/server/services/checkin-service'
import { defineAuthenticatedEventHandler } from '~~/server/utils/auth'

export default defineAuthenticatedEventHandler((_event, user) => checkinService.getStatus(user.id))
