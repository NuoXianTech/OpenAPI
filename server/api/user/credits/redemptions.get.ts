import type { H3Event } from 'h3'
import { redemptionService } from '~~/server/services/redemption-service'
import { requireAuth } from '~~/server/utils/auth'
import { readPaginationQuery } from '~~/server/utils/request-pagination'

export default defineEventHandler(async (event: H3Event) => {
  const user = await requireAuth(event)
  const { limit, offset } = readPaginationQuery(event)
  const data = await redemptionService.listUserRedemptions(user.id, limit, offset)
  return data
})
