import { z } from 'zod'
import {
  displayNameSchema,
  emailSchema,
  optionalDate,
  passwordSchema,
  usernameSchema
} from '../common'

export const adminBanUserSchema = z.object({
  id: z.coerce.number().int().positive('id is required'),
  isBanned: z.boolean(),
  reason: z.string().trim().max(500, '封禁原因最多 500 字').optional(),
  bannedUntil: optionalDate
}).refine(
  d => !d.isBanned || !d.bannedUntil || d.bannedUntil.getTime() > Date.now(),
  { message: '封禁到期时间必须晚于当前时间', path: ['bannedUntil'] }
)
export type AdminBanUserInput = z.output<typeof adminBanUserSchema>

export const adminCreateUserSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  displayName: displayNameSchema.optional(),
  isActive: z.boolean().optional()
})

export const adminUpdateUserSchema = z
  .object({
    id: z.coerce.number().int().positive('id is required'),
    username: usernameSchema.optional(),
    email: emailSchema.optional(),
    displayName: displayNameSchema.optional(),
    isActive: z.boolean().optional(),
    isBanned: z.boolean().optional(),
    password: z.preprocess(
      v => (v === '' || v === null ? undefined : v),
      passwordSchema.optional()
    )
  })
  .refine(
    d => d.username !== undefined
      || d.email !== undefined
      || d.displayName !== undefined
      || d.isActive !== undefined
      || d.isBanned !== undefined
      || d.password !== undefined,
    { message: '至少需要修改一个字段', path: [] }
  )
