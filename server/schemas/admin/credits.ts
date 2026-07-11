import { z } from 'zod'

export const adminAdjustCreditsSchema = z.object({
  userIds: z.array(z.coerce.number().int().positive()).min(1, '请至少选择一个用户'),
  operation: z.enum(['grant', 'revoke', 'reset'], 'operation 只能是 grant / revoke / reset'),
  amount: z.coerce.number().int().min(0).default(0),
  remark: z.string().trim().max(500).optional()
})
