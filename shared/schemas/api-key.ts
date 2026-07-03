import { z } from 'zod'
import { isCidr } from '../utils/cidr'

export const apiKeyNameSchema = z.string().trim().max(80, '名称最多 80 字')

export const apiKeyScopeSchema = z.string()
  .trim()
  .min(1, '接口标识不能为空')
  .max(80, '接口标识过长')
  .regex(/^[a-zA-Z0-9_.\-*]+$/, '接口标识仅允许字母数字 _ - . *')

export const apiKeyCidrSchema = z.string()
  .trim()
  .min(1, 'CIDR 不能为空')
  .max(64, 'CIDR 过长')
  .refine(isCidr, { message: '必须为 CIDR 格式（例：1.2.3.4/32 或 10.0.0.0/8）' })

export const apiKeyTotalQuotaSchema = z.preprocess(
  (v) => {
    if (v === undefined) return undefined
    if (v === null || v === '') return null
    return v
  },
  z.union([z.null(), z.coerce.number().int().min(0, '积分上限不能为负')]).optional()
)

export const apiKeyCreateCountSchema = z.coerce.number().int().min(1, '至少 1 个').max(5, '最多 5 个').default(1)

export function nullableArraySchema<T extends z.ZodTypeAny>(item: T, max: number) {
  return z.preprocess(
    (v) => {
      if (v === undefined) return undefined
      if (v === null) return null
      if (Array.isArray(v) && v.length === 0) return null
      return v
    },
    z.union([z.array(item).max(max), z.null()]).optional()
  )
}
