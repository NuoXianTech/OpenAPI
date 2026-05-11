import type { H3Event } from 'h3'
import { createError } from 'h3'
import { redemptionService } from '~~/server/service/redemptionService'
import { operationLogService } from '~~/server/service/operationLogService'
import { requireAdmin } from '~~/server/utils/auth'

interface ToggleBody {
  id?: number
  batchId?: string
  enabled?: boolean
}

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const body = await readBody<ToggleBody>(event) || {}

  const enabled = body.enabled !== false
  const id = Number(body.id) || 0
  const batchId = (body.batchId || '').toString().trim()

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

  if (batchId) {
    const res = await redemptionService.toggleBatch(batchId, enabled)
    await operationLogService.addLog({
      userId: admin.id || null,
      actor: admin.username,
      action: enabled ? 'admin.redemption_code.batch_enable' : 'admin.redemption_code.batch_disable',
      resourceType: 'redemption_code_batch',
      resourceId: batchId,
      detail: { affected: res.affected },
    })
    return res
  }

  throw createError({ statusCode: 400, message: 'id 或 batchId 必填一个' })
})
