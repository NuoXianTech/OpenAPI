import { z } from 'zod'
import { isApiStatusValue } from '#shared/config/api-status'
import { enumMessage, nonNegativeInt, optionalPublicUrl, optionalString, positiveInt, requiredString } from '../validation'

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
  pathVersion: requiredString('接口版本', { max: 8 }),
  code: requiredString('接口标识', { max: 50 }),
  overrides: z.object({
    name: optionalString('接口名称', { max: 100 }),
    shortDesc: optionalString('接口简介', { max: 50 }),
    description: z.string().optional(),
    docUrl: optionalPublicUrl('文档地址', 200),
    status: apiStatusSchema.optional(),
    categoryId: z.coerce.number().int().positive().nullable().optional(),
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
  }).optional()
})

export const adminUpdateApiSchema = z.object({
  id: positiveInt('接口 ID'),
  name: requiredString('接口名称', { max: 100 }).optional(),
  status: apiStatusSchema.optional(),
  categoryId: z.preprocess(
    v => (v === '' || v === null ? null : v),
    z.union([z.coerce.number().int().positive(), z.null()]).optional()
  ),
  shortDesc: requiredString('接口简介', { max: 50 }).optional(),
  description: z.string().trim().optional(),
  docUrl: optionalPublicUrl('文档地址', 200),
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
