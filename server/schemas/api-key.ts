import { z } from 'zod'
import { isCidr } from '../../shared/utils/cidr'
import { maxMessage, minMessage, requiredMessage } from '../../shared/schemas/validation'

export const apiKeyNameSchema = z.string().trim().max(80, maxMessage('名称', 80))

export const apiKeyScopeSchema = z.string()
  .trim()
  .min(1, requiredMessage('接口标识'))
  .max(80, maxMessage('接口标识', 80))
  .regex(/^[a-zA-Z0-9_.\-*]+$/, '接口标识仅允许字母数字 _ - . *')

export const apiKeyCidrSchema = z.string()
  .trim()
  .min(1, requiredMessage('CIDR'))
  .max(64, maxMessage('CIDR', 64))
  .refine(isCidr, { message: '必须为 CIDR 格式（例：1.2.3.4/32 或 10.0.0.0/8）' })

export const apiKeyTotalQuotaSchema = z.preprocess(
  (v) => {
    if (v === undefined) return undefined
    if (v === null || v === '') return null
    return v
  },
  z.union([z.null(), z.coerce.number().int().min(0, '积分上限不能为负')]).optional()
)

export const apiKeyCreateCountSchema = z.coerce.number().int().min(1, minMessage('生成数量', 1, '个')).max(5, maxMessage('生成数量', 5, '个')).default(1)

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
