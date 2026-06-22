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
import { getQuery } from 'h3'
import { creditService, type CreditReason } from '~~/server/service/creditService'
import { requireAdmin } from '~~/server/utils/auth'
import { parsePaginationQuery } from '~~/server/utils/pagination'

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)
  const query = getQuery(event)

  const userId = query.userId ? Number(query.userId) : undefined
  const reasonRaw = (query.reason || '').toString()
  const reason = reasonRaw ? (reasonRaw as CreditReason) : undefined
  const { limit, offset } = parsePaginationQuery(query)

  const data = await creditService.listTransactions({ userId, reason, limit, offset })
  return data
})
