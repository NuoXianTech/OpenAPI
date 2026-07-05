import type { H3Event } from 'h3'
import type { CreditReason } from '~~/server/services/credit-service'
import { creditService } from '~~/server/services/credit-service'
import { requireAuth } from '~~/server/utils/auth'
import { readPaginationQuery } from '~~/server/utils/request-pagination'
import { readQueryOption } from '~~/server/utils/request-query'

const VALID_REASONS: CreditReason[] = ['admin_grant', 'admin_revoke', 'admin_reset', 'api_charge', 'api_refund', 'signup_bonus', 'redemption_code', 'checkin']
const DIRECTIONS = ['in', 'out'] as const

export default defineEventHandler(async (event: H3Event) => {
  const user = await requireAuth(event)
  const { query, limit, offset } = readPaginationQuery(event)
  const reason = readQueryOption(query.reason, VALID_REASONS)
  const direction = readQueryOption(query.direction, DIRECTIONS)

  const data = await creditService.listUserTransactions(user.id, { reason, direction, limit, offset })
  return data
})
