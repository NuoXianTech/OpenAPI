import type { H3Event } from 'h3'
import { checkinService } from '~~/server/services/checkin-service'
import { defineAuthenticatedEventHandler } from '~~/server/utils/auth'

export default defineAuthenticatedEventHandler(async (event: H3Event, user) => {
  return await checkinService.getStatus(user.id)
})
