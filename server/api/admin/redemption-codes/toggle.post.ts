import { createError } from 'h3'
import { adminToggleRedemptionCodeSchema } from '~~/server/schemas/admin'
import { redemptionService } from '~~/server/services/redemption-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event, admin) => {
  const { id, batchId, enabled: enabledRaw } = await readZodBody(event, adminToggleRedemptionCodeSchema)

  const enabled = enabledRaw !== false

  if (id) {
    const single = await redemptionService.toggle(id, enabled)
    if (single.affected === 0) {
      throw createError({ statusCode: 404, message: '兑换码不存在' })
    }
    await addRequestOperationLog(event, {
      userId: admin.id,
      actor: admin.username,
      action: enabled ? 'admin.redemption-code.enable' : 'admin.redemption-code.disable',
      resourceType: 'redemption-code',
      resourceId: id
    })
    return single
  }

  // schema 已保证 id 与 batchId 恰好提供一个
  const res = await redemptionService.toggleBatch(batchId!, enabled)
  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: enabled ? 'admin.redemption-code.batch-enable' : 'admin.redemption-code.batch-disable',
    resourceType: 'redemption-code-batch',
    resourceId: batchId,
    detail: { affected: res.affected }
  })
  return res
})
