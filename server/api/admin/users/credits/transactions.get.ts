/**
 * Admin · 用户积分变动流水查询
 *
 * Query:
 *   - userId?     : number  指定用户
 *   - reason?     : string  admin_grant/admin_revoke/admin_reset/api_charge/api_refund
 *   - limit?      : 默认 50，最大 200
 *   - offset?     : 默认 0
 */

import type { H3Event } from 'h3'
import { creditService, type CreditReason } from '~~/server/services/credit-service'
import { requireAdmin } from '~~/server/utils/auth'
import { readPaginationQuery } from '~~/server/utils/request-pagination'
import { readQueryNumber, readQueryText } from '~~/server/utils/request-query'

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)
  const { query, limit, offset } = readPaginationQuery(event)

  const userId = readQueryNumber(query.userId)
  const reasonRaw = readQueryText(query.reason)
  const reason = reasonRaw ? (reasonRaw as CreditReason) : undefined

  const data = await creditService.listTransactions({ userId, reason, limit, offset })
  return data
})
