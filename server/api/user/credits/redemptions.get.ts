import type { H3Event } from 'h3'
import { redemptionService } from '~~/server/services/redemption-service'
import { defineAuthenticatedEventHandler } from '~~/server/utils/auth'
import { readPaginationQuery } from '~~/server/utils/pagination'

export default defineAuthenticatedEventHandler((event: H3Event, user) => {
  const { limit, offset } = readPaginationQuery(event)
  return redemptionService.listUserRedemptions(user.id, limit, offset)
})
