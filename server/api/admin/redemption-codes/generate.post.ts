import type { H3Event } from 'h3'
import { adminGenerateRedemptionCodeSchema } from '~~/server/schemas/admin'
import { redemptionService } from '~~/server/services/redemption-service'
import { operationLogService } from '~~/server/services/operation-log-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event: H3Event, admin) => {
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

  await operationLogService.addRequestLog(event, {
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
