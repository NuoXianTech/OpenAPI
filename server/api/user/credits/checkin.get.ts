import type { H3Event } from 'h3'
import { checkinService } from '~~/server/services/checkin-service'
import { defineAuthenticatedEventHandler } from '~~/server/utils/auth'

export default defineAuthenticatedEventHandler((event: H3Event, user) => {
  return checkinService.getStatus(user.id)
})
