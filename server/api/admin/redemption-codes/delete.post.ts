import { createError } from 'h3'
import { adminDeleteRedemptionCodeSchema } from '~~/server/schemas/admin'
import { redemptionService } from '~~/server/services/redemption-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event, admin) => {
  const { id, batchId, includeUsed } = await readZodBody(event, adminDeleteRedemptionCodeSchema)

  if (id) {
    const single = await redemptionService.remove(id)
    if (single.affected === 0) {
      throw createError({ statusCode: 404, message: '兑换码不存在' })
    }
    await addRequestOperationLog(event, {
      userId: admin.id,
      actor: admin.username,
      action: 'admin.redemption-code.delete',
      resourceType: 'redemption-code',
      resourceId: id
    })
    return single
  }

  // schema 已保证 id 与 batchId 恰好提供一个
  const res = await redemptionService.removeBatch(batchId!, !!includeUsed)
  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.redemption-code.batch-delete',
    resourceType: 'redemption-code-batch',
    resourceId: batchId,
    detail: { includeUsed: !!includeUsed, affected: res.affected }
  })
  return res
})
