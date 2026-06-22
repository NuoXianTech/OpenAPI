import type { H3Event } from 'h3'
import { createError, getQuery } from 'h3'
import type { CreditReason } from '~~/server/service/creditService'
import { creditService } from '~~/server/service/creditService'
import { requireAuth } from '~~/server/utils/auth'
import { parsePaginationQuery } from '~~/server/utils/pagination'

const VALID_REASONS: CreditReason[] = ['admin_grant', 'admin_revoke', 'admin_reset', 'api_charge', 'api_refund', 'signup_bonus', 'redemption_code', 'checkin']

export default defineEventHandler(async (event: H3Event) => {
  const user = await requireAuth(event)
  if (!user.id || user.kind !== 'user') {
    throw createError({ statusCode: 403, message: 'admin 不持有用户积分' })
  }

  const query = getQuery(event)
  const reasonRaw = (query.reason || '').toString()
  const reason = VALID_REASONS.includes(reasonRaw as CreditReason) ? reasonRaw as CreditReason : undefined
  const directionRaw = (query.direction || '').toString()
  const direction = directionRaw === 'in' || directionRaw === 'out' ? directionRaw : undefined
  const { limit, offset } = parsePaginationQuery(query)

  const data = await creditService.listUserTransactions(user.id, { reason, direction, limit, offset })
  return data
})
