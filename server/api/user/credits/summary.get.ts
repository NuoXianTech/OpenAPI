import type { H3Event } from 'h3'
import { creditService } from '~~/server/services/credit-service'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  const user = await requireAuth(event)
  const data = await creditService.getUserCreditsSummary(user.id)
  return data
})
