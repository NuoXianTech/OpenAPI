/**
 * Admin · 余额调整 API
 *
 * Body:
 *   - userIds: number[]                       目标用户。空数组 = 全部未删除用户
 *   - operation: 'grant' | 'revoke' | 'reset' 操作类型
 *   - amount: number                          金额（>=0；reset 时为目标值）
 *   - remark?: string                         备注
 */

import type { H3Event } from 'h3'
import { createError } from 'h3'
import { creditService } from '~~/server/service/creditService'
import { operationLogService } from '~~/server/service/operationLogService'
import { requireAdmin } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const body = await readBody(event) as Record<string, unknown>

  const userIds = Array.isArray(body.userIds)
    ? body.userIds.map(Number).filter((n: number) => Number.isFinite(n) && n > 0)
    : []
  const operation = String(body.operation || '')
  const amount = Math.max(Math.trunc(Number(body.amount) || 0), 0)
  const remark = String(body.remark ?? '').trim().slice(0, 500) || null

  if (!['grant', 'revoke', 'reset'].includes(operation)) {
    throw createError({ statusCode: 400, message: 'operation 只能是 grant / revoke / reset' })
  }
  if (operation !== 'reset' && amount <= 0) {
    throw createError({ statusCode: 400, message: 'amount 必须大于 0' })
  }

  const result = await creditService.adminBatchAdjust({
    userIds,
    operation: operation as 'grant' | 'revoke' | 'reset',
    amount,
    operatorId: admin.id || null,
    operatorName: admin.username,
    remark,
  })

  await operationLogService.addLog({
    userId: admin.id || null,
    actor: admin.username,
    actorType: 'admin',
    action: `admin.credit.${operation}`,
    resourceType: 'user',
    resourceId: userIds.length === 1 ? String(userIds[0]) : `batch:${result.affected}`,
    detail: { userIds, operation, amount, remark, affected: result.affected },
  })

  return result
})
