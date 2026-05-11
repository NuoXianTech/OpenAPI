import type { H3Event } from 'h3'
import { createError } from 'h3'
import { creditService } from '~~/server/service/creditService'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  const user = await requireAuth(event)
  if (!user.id || user.kind !== 'user') {
    throw createError({ statusCode: 403, message: 'admin 不持有用户积分' })
  }

  const data = await creditService.getUserWalletSummary(user.id)
  return data
})
