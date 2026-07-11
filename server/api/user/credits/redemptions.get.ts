import type { H3Event } from 'h3'
import { redemptionService } from '~~/server/services/redemption-service'
import { defineAuthenticatedEventHandler } from '~~/server/utils/auth'
import { readPaginationQuery } from '~~/server/utils/pagination'

export default defineAuthenticatedEventHandler(async (event: H3Event, user) => {
  const { limit, offset } = readPaginationQuery(event)
  const data = await redemptionService.listUserRedemptions(user.id, limit, offset)
  return data
})
