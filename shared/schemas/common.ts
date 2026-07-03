import { z } from 'zod'

export const idSchema = z.object({
  id: z.coerce.number().int().positive('id is required')
})

export const messageIdSchema = z.object({
  messageId: z.coerce.number().int().positive('messageId is required')
})

export const optionalDate = z.preprocess(
  (v) => {
    if (v === undefined) return undefined
    if (v === null || v === '') return null
    const d = new Date(typeof v === 'string' || typeof v === 'number' || v instanceof Date ? v : String(v))
    return Number.isNaN(d.getTime()) ? null : d
  },
  z.union([z.date(), z.null()]).optional()
)

export const usernameSchema = z
  .string()
  .trim()
  .min(3, '用户名至少 3 位')
  .max(32, '用户名最多 32 位')
  .regex(/^[a-zA-Z0-9_-]+$/, '只能包含字母、数字、下划线和短横线')

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email('请输入有效的邮箱地址'))

export const passwordSchema = z.string().min(8, '密码至少 8 位')

export const displayNameSchema = z.string().trim().max(32, '显示名最多 32 字')
