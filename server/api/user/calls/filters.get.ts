import type { H3Event } from 'h3'
import { apiCallService } from '~~/server/services/api-call-service'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  const user = await requireAuth(event)
  const data = await apiCallService.listFilterOptionsForUser(user.id)
  return data
})
