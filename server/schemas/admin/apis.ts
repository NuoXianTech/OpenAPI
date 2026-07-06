import { z } from 'zod'
import { isApiStatusValue } from '#shared/config/api-status'
import { enumMessage, nonNegativeInt, positiveInt, requiredString } from '#shared/schemas/validation'

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

const guardLimitSchema = nonNegativeInt('限流额度')
const guardTimeoutSchema = z.coerce.number().int().min(100, '超时时间不能小于 100ms').max(120000, '超时时间不能超过 120000ms')
const apiStatusSchema = z.coerce.number().int().refine(isApiStatusValue, '接口状态不合法')

export const adminRegisterApiSchema = z.object({
  pathVersion: requiredString('接口版本'),
  code: requiredString('接口标识'),
  overrides: z.object({
    name: z.string().optional(),
    shortDesc: z.string().optional(),
    description: z.string().optional(),
    docUrl: z.string().optional(),
    status: apiStatusSchema.optional(),
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

export const adminUpdateApiSchema = z.object({
  id: positiveInt('接口 ID'),
  name: z.string().trim().optional(),
  status: apiStatusSchema.optional(),
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
  id: positiveInt('接口 ID'),
  field: z.enum(['isEnabled', 'isStatistics'], enumMessage('切换字段', ['isEnabled', 'isStatistics'])),
  value: z.boolean()
})
