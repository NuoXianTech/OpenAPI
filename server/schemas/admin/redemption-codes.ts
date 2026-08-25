import { z } from 'zod'

export const adminGenerateRedemptionCodeSchema = z.object({
  amount: z.coerce.number().int().positive('amount 必须 > 0'),
  count: z.coerce.number().int().min(1).max(100).optional(),
  maxUses: z.coerce.number().int().min(1).optional(),
  expiresAt: z.string().nullable().optional(),
  note: z.string().nullable().optional()
})

/**
 * 单张码用 id 寻址，整批用 batchId，二者恰好提供一个。
 * 只校验“至少一个”会让同时传入的请求静默走 id 分支，请求含义取决于服务端读取顺序，
 * 因此这里连“同时传入”一起拒掉，让寻址方式在协议层面无歧义。
 */
function exactlyOneTarget(data: { id?: number, batchId?: string }): boolean {
  return Boolean(data.id) !== Boolean(data.batchId)
}

function exactlyOneTargetIssue() {
  return { message: 'id 与 batchId 必须且只能提供一个', path: ['id'] }
}

export const adminToggleRedemptionCodeSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  batchId: z.string().trim().min(1).optional(),
  enabled: z.boolean().optional()
}).refine(exactlyOneTarget, exactlyOneTargetIssue())

export const adminDeleteRedemptionCodeSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  batchId: z.string().trim().min(1).optional(),
  includeUsed: z.boolean().optional()
}).refine(exactlyOneTarget, exactlyOneTargetIssue())
