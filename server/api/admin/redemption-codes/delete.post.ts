import type { H3Event } from 'h3'
import { createError } from 'h3'
import { redemptionService } from '~~/server/service/redemptionService'
import { operationLogService } from '~~/server/service/operationLogService'
import { requireAdmin } from '~~/server/utils/auth'

interface DeleteBody {
  id?: number
  batchId?: string
  /** 删除批次时是否包含已被兑换过的码（默认 false：保留以便审计） */
  includeUsed?: boolean
}

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const body = await readBody<DeleteBody>(event) || {}
  const id = Number(body.id) || 0
  const batchId = (body.batchId || '').toString().trim()

  if (id) {
    const removed = await redemptionService.remove(id)
    if (!removed) throw createError({ statusCode: 404, message: '兑换码不存在' })
    await operationLogService.addLog({
      userId: admin.id || null,
      actor: admin.username,
      action: 'admin.redemption_code.delete',
      resourceType: 'redemption_code',
      resourceId: String(id),
    })
    return { code: 0, msg: 'ok', data: removed }
  }

  if (batchId) {
    const res = await redemptionService.removeBatch(batchId, !!body.includeUsed)
    await operationLogService.addLog({
      userId: admin.id || null,
      actor: admin.username,
      action: 'admin.redemption_code.batch_delete',
      resourceType: 'redemption_code_batch',
      resourceId: batchId,
      detail: { includeUsed: !!body.includeUsed, affected: res.affected },
    })
    return { code: 0, msg: 'ok', data: res }
  }

  throw createError({ statusCode: 400, message: 'id 或 batchId 必填一个' })
})
