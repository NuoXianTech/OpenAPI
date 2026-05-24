import type { H3Event } from 'h3'
import { createError } from 'h3'
import { adminDeleteRedemptionCodeSchema } from '#shared/schemas/admin'
import { redemptionService } from '~~/server/service/redemptionService'
import { operationLogService } from '~~/server/service/operationLogService'
import { requireAdmin } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const { id, batchId, includeUsed } = await readZodBody(event, adminDeleteRedemptionCodeSchema)

  if (id) {
    const removed = await redemptionService.remove(id)
    if (!removed) throw createError({ statusCode: 404, message: '兑换码不存在' })
    await operationLogService.addLog({
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
  await operationLogService.addLog({
    userId: admin.id || null,
    actor: admin.username,
    action: 'admin.redemption-code.batch-delete',
    resourceType: 'redemption-code-batch',
    resourceId: batchId,
    detail: { includeUsed: !!includeUsed, affected: res.affected }
  })
  return res
})
