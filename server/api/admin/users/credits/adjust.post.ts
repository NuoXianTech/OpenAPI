/**
 * Admin · 积分调整 API
 *
 * Body:
 *   - userIds: number[]                       目标用户，至少包含一项
 *   - operation: 'grant' | 'revoke' | 'reset' 操作类型
 *   - amount: number                          金额（>=0；reset 时为目标值）
 *   - remark?: string                         备注
 */

import type { H3Event } from 'h3'
import { createError } from 'h3'
import { adminAdjustCreditsSchema } from '~~/server/schemas/admin'
import { creditService } from '~~/server/services/credit-service'
import { operationLogService } from '~~/server/services/operation-log-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event: H3Event, admin) => {
  const { userIds, operation, amount, remark } = await readZodBody(event, adminAdjustCreditsSchema)

  if (operation !== 'reset' && amount <= 0) {
    throw createError({ statusCode: 400, message: 'amount 必须大于 0' })
  }

  const result = await creditService.adminBatchAdjust({
    userIds,
    operation,
    amount,
    operatorId: admin.id || null,
    operatorName: admin.username,
    remark: remark || null
  })

  await operationLogService.addRequestLog(event, {
    userId: admin.id || null,
    actor: admin.username,
    action: `admin.credit.${operation}`,
    resourceType: 'user',
    resourceId: userIds.length === 1 ? String(userIds[0]) : `batch:${result.affected}`,
    detail: { userIds, operation, amount, remark, affected: result.affected }
  })

  return result
})
