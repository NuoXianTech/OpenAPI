import type { H3Event } from 'h3'
import { createError } from 'h3'
import { adminToggleRedemptionCodeSchema } from '#shared/schemas/admin'
import { redemptionService } from '~~/server/service/redemptionService'
import { operationLogService } from '~~/server/service/operationLogService'
import { requireAdmin } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const { id, batchId, enabled: enabledRaw } = await readZodBody(event, adminToggleRedemptionCodeSchema)

  const enabled = enabledRaw !== false

  if (id) {
    const updated = await redemptionService.toggle(id, enabled)
    if (!updated) throw createError({ statusCode: 404, message: '兑换码不存在' })
    await operationLogService.addLog({
      userId: admin.id || null,
      actor: admin.username,
      action: enabled ? 'admin.redemption_code.enable' : 'admin.redemption_code.disable',
      resourceType: 'redemption_code',
      resourceId: String(id),
    })
    return updated
  }

  // refine 已保证 id 或 batchId 至少一个非空
  const res = await redemptionService.toggleBatch(batchId!, enabled)
  await operationLogService.addLog({
    userId: admin.id || null,
    actor: admin.username,
    action: enabled ? 'admin.redemption_code.batch_enable' : 'admin.redemption_code.batch_disable',
    resourceType: 'redemption_code_batch',
    resourceId: batchId,
    detail: { affected: res.affected },
  })
  return res
})
