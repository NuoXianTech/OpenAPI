import { z } from 'zod'

export const adminAdjustCreditsSchema = z
  .object({
    userIds: z.array(z.coerce.number().int().positive()).default([]),
    scope: z.enum(['selected', 'all'], 'scope 只能是 selected / all').default('selected'),
    confirmAll: z.boolean().optional(),
    operation: z.enum(['grant', 'revoke', 'reset'], 'operation 只能是 grant / revoke / reset'),
    amount: z.coerce.number().int().min(0).default(0),
    remark: z.string().trim().max(500).optional()
  })
  .refine(
    d => d.scope !== 'selected' || d.userIds.length > 0,
    { message: '请选择至少一个用户，或显式选择全员范围', path: ['userIds'] }
  )
  .refine(
    d => d.scope !== 'all' || d.confirmAll === true,
    { message: '全员积分调整必须显式确认', path: ['confirmAll'] }
  )
