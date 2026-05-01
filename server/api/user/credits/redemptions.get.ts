import type { H3Event } from 'h3'
import { createError, getQuery } from 'h3'
import { redemptionService } from '~~/server/service/redemptionService'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  const user = await requireAuth(event)
  if (!user.id || user.kind !== 'user') {
    throw createError({ statusCode: 403, message: 'admin 不持有兑换记录' })
  }
  const query = getQuery(event)
  const limit = query.limit ? Number(query.limit) : 50
  const offset = query.offset ? Number(query.offset) : 0
  const data = await redemptionService.listUserRedemptions(user.id, limit, offset)
  return { code: 0, msg: 'ok', data }
})
