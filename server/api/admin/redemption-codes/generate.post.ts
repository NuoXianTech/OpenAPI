import type { H3Event } from 'h3'
import { adminGenerateRedemptionCodeSchema } from '#shared/schemas/admin'
import { redemptionService } from '~~/server/service/redemptionService'
import { operationLogService } from '~~/server/service/operationLogService'
import { requireAdmin } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const body = await readZodBody(event, adminGenerateRedemptionCodeSchema)

  const count = body.count ?? 1
  const maxUses = body.maxUses ?? 1
  const length = body.length ?? 16

  let expiresAt: Date | null = null
  if (body.expiresAt) {
    const d = new Date(body.expiresAt)
    if (!Number.isNaN(d.getTime()) && d.getTime() > Date.now()) expiresAt = d
  }

  const data = await redemptionService.generate({
    amount: body.amount,
    count,
    prefix: body.prefix || null,
    length,
    maxUses,
    expiresAt,
    note: body.note || null,
    createdBy: admin.id || null
  })

  await operationLogService.addLog({
    userId: admin.id || null,
    actor: admin.username,
    action: 'admin.redemption-code.generate',
    resourceType: 'redemption-code',
    resourceId: data.batchId,
    detail: {
      batchId: data.batchId,
      generated: data.generated,
      amount: data.amount,
      maxUses: data.maxUses,
      note: data.note
    }
  })

  return data
})
