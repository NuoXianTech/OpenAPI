import type { H3Event } from 'h3'
import { checkinService } from '~~/server/services/checkin-service'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  const user = await requireAuth(event)
  return await checkinService.getStatus(user.id)
})
