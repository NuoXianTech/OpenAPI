import { z } from 'zod'

export const adminGenerateRedemptionCodeSchema = z.object({
  amount: z.coerce.number().int().positive('amount 必须 > 0'),
  count: z.coerce.number().int().min(1).max(1000).optional(),
  prefix: z.string().nullable().optional(),
  length: z.coerce.number().int().min(8).max(48).optional(),
  maxUses: z.coerce.number().int().min(1).optional(),
  expiresAt: z.string().nullable().optional(),
  note: z.string().nullable().optional()
})

export const adminToggleRedemptionCodeSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  batchId: z.string().trim().optional(),
  enabled: z.boolean().optional()
}).refine(d => Boolean(d.id) || Boolean(d.batchId), {
  message: 'id 或 batchId 必填一个',
  path: ['id']
})

export const adminDeleteRedemptionCodeSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  batchId: z.string().trim().optional(),
  includeUsed: z.boolean().optional()
}).refine(d => Boolean(d.id) || Boolean(d.batchId), {
  message: 'id 或 batchId 必填一个',
  path: ['id']
})
