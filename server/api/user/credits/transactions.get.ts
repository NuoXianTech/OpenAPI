import type { H3Event } from 'h3'
import type { CreditReason } from '~~/server/services/credit-service'
import { creditService } from '~~/server/services/credit-service'
import { defineAuthenticatedEventHandler } from '~~/server/utils/auth'
import { readPaginationQuery } from '~~/server/utils/pagination'
import { readQueryOption } from '~~/server/utils/request-query'

const VALID_REASONS: CreditReason[] = ['admin_grant', 'admin_revoke', 'admin_reset', 'api_charge', 'api_refund', 'signup_bonus', 'redemption_code', 'checkin']
const DIRECTIONS = ['in', 'out'] as const

export default defineAuthenticatedEventHandler((event: H3Event, user) => {
  const { query, limit, offset } = readPaginationQuery(event)
  const reason = readQueryOption(query.reason, VALID_REASONS)
  const direction = readQueryOption(query.direction, DIRECTIONS)

  return creditService.listUserTransactions(user.id, { reason, direction, limit, offset })
})
