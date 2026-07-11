/**
 * Admin · 用户积分变动流水查询
 *
 * Query:
 *   - userId?     : number  指定用户
 *   - reason?     : string  admin_grant/admin_revoke/admin_reset/api_charge/api_refund
 *   - limit?      : 默认 20，最大 200
 *   - offset?     : 默认 0
 */

import type { H3Event } from 'h3'
import { creditService, type CreditReason } from '~~/server/services/credit-service'
import { requireAdmin } from '~~/server/utils/auth'
import { readPaginationQuery } from '~~/server/utils/pagination'
import {
  readQueryDate,
  readQueryNumber,
  readQueryOption,
  readQueryText
} from '~~/server/utils/request-query'

const CREDIT_REASON_OPTIONS: CreditReason[] = [
  'admin_grant',
  'admin_revoke',
  'admin_reset',
  'api_charge',
  'api_refund',
  'signup_bonus',
  'redemption_code',
  'checkin'
]
const DIRECTION_OPTIONS = ['in', 'out'] as const

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)
  const { query, limit, offset } = readPaginationQuery(event, { defaultLimit: 20 })

  const userId = readQueryNumber(query.userId)
  const reason = readQueryOption(query.reason, CREDIT_REASON_OPTIONS)

  return creditService.listTransactions({
    userId,
    reason,
    direction: readQueryOption(query.direction, DIRECTION_OPTIONS),
    operatorName: readQueryText(query.operatorName),
    startAt: readQueryDate(query.startAt),
    endAt: readQueryDate(query.endAt),
    minAmount: readQueryNumber(query.minAmount),
    maxAmount: readQueryNumber(query.maxAmount),
    limit,
    offset
  })
})
