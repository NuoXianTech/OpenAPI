import type { H3Event } from 'h3'
import { apiCallService } from '~~/server/service/apiCallService'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  const user = await requireAuth(event)
  const data = await apiCallService.getSummaryForUser(user.id)
  return data
})
