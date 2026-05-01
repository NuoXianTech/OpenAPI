import type { H3Event } from 'h3'
import { createError } from 'h3'
import { redemptionService } from '~~/server/service/redemptionService'
import { operationLogService } from '~~/server/service/operationLogService'
import { requireAdmin } from '~~/server/utils/auth'

interface GenerateBody {
  amount?: number
  count?: number
  prefix?: string | null
  length?: number
  maxUses?: number
  expiresAt?: string | null
  note?: string | null
}

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const body = await readBody<GenerateBody>(event) || {}

  const amount = Number(body.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    throw createError({ statusCode: 400, message: 'amount 必须 > 0' })
  }
  const count = Math.min(Math.max(Math.trunc(Number(body.count) || 1), 1), 1000)
  const maxUses = Math.max(Math.trunc(Number(body.maxUses) || 1), 1)
  const length = Math.min(Math.max(Math.trunc(Number(body.length) || 16), 8), 48)

  let expiresAt: Date | null = null
  if (body.expiresAt) {
    const d = new Date(body.expiresAt)
    if (!Number.isNaN(d.getTime()) && d.getTime() > Date.now()) expiresAt = d
  }

  const data = await redemptionService.generate({
    amount: Math.trunc(amount),
    count,
    prefix: body.prefix || null,
    length,
    maxUses,
    expiresAt,
    note: body.note || null,
    createdBy: admin.id || null,
  })

  await operationLogService.addLog({
    userId: admin.id || null,
    actor: admin.username,
    action: 'admin.redemption_code.generate',
    resourceType: 'redemption_code',
    resourceId: data.batchId,
    detail: {
      batchId: data.batchId,
      generated: data.generated,
      amount: data.amount,
      maxUses: data.maxUses,
      note: data.note,
    },
  })

  return { code: 0, msg: 'ok', data }
})
