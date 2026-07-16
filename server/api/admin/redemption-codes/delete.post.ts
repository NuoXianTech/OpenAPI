import { createError } from 'h3'
import { adminDeleteRedemptionCodeSchema } from '~~/server/schemas/admin'
import { redemptionService } from '~~/server/services/redemption-service'
import { operationLogService } from '~~/server/services/operation-log-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event, admin) => {
  const { id, batchId, includeUsed } = await readZodBody(event, adminDeleteRedemptionCodeSchema)

  if (id) {
    const removed = await redemptionService.remove(id)
    if (!removed) throw createError({ statusCode: 404, message: '兑换码不存在' })
    await operationLogService.addRequestLog(event, {
      userId: admin.id || null,
      actor: admin.username,
      action: 'admin.redemption-code.delete',
      resourceType: 'redemption-code',
      resourceId: String(id)
    })
    return removed
  }

  // refine 已保证 id 或 batchId 至少一个非空
  const res = await redemptionService.removeBatch(batchId!, !!includeUsed)
  await operationLogService.addRequestLog(event, {
    userId: admin.id || null,
    actor: admin.username,
    action: 'admin.redemption-code.batch-delete',
    resourceType: 'redemption-code-batch',
    resourceId: batchId,
    detail: { includeUsed: !!includeUsed, affected: res.affected }
  })
  return res
})
