import { z } from 'zod'

const methodCostsSchema = z.preprocess(
  (v) => {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return v
    const out: Record<string, number> = {}
    for (const [k, raw] of Object.entries(v as Record<string, unknown>)) {
      const num = Number(raw)
      if (Number.isFinite(num) && num >= 0) out[k.toUpperCase()] = Math.trunc(num)
    }
    return out
  },
  z.record(z.string(), z.number().int().min(0))
)

export const adminRegisterApiSchema = z.object({
  pathVersion: z.string().trim().min(1, 'pathVersion 和 code 均必填'),
  code: z.string().trim().min(1, 'pathVersion 和 code 均必填'),
  overrides: z.object({
    name: z.string().optional(),
    shortDesc: z.string().optional(),
    description: z.string().optional(),
    docUrl: z.string().optional(),
    status: z.number().optional(),
    categoryId: z.number().nullable().optional(),
    isEnabled: z.boolean().optional(),
    isApiKey: z.boolean().optional(),
    isStatistics: z.boolean().optional(),
    rateLimitPerSecond: z.number().optional(),
    rateLimitPerMinute: z.number().optional(),
    rateLimitPerHour: z.number().optional(),
    rateLimitPerDay: z.number().optional(),
    dailyQuota: z.number().optional(),
    methodCosts: methodCostsSchema.optional(),
    timeoutMs: z.number().optional()
  }).optional()
})

const guardLimitSchema = z.coerce.number().int().min(0, 'limit must be >= 0')
const guardTimeoutSchema = z.coerce.number().int().min(100, 'timeoutMs must be >= 100').max(120000, 'timeoutMs is too large')

export const adminUpdateApiSchema = z.object({
  id: z.coerce.number().int().positive('id is required'),
  name: z.string().trim().optional(),
  status: z.coerce.number().optional(),
  categoryId: z.preprocess(
    v => (v === '' || v === null ? null : v),
    z.union([z.coerce.number().int().positive(), z.null()]).optional()
  ),
  shortDesc: z.string().trim().optional(),
  description: z.string().trim().optional(),
  docUrl: z.string().trim().optional(),
  isEnabled: z.boolean().optional(),
  isApiKey: z.boolean().optional(),
  isStatistics: z.boolean().optional(),
  rateLimitPerSecond: guardLimitSchema.optional(),
  rateLimitPerMinute: guardLimitSchema.optional(),
  rateLimitPerHour: guardLimitSchema.optional(),
  rateLimitPerDay: guardLimitSchema.optional(),
  dailyQuota: guardLimitSchema.optional(),
  methodCosts: methodCostsSchema.optional(),
  timeoutMs: guardTimeoutSchema.optional()
})

export const adminToggleApiSchema = z.object({
  id: z.coerce.number().int().positive('invalid parameters'),
  field: z.enum(['isEnabled', 'isStatistics'], 'invalid parameters'),
  value: z.boolean()
})
