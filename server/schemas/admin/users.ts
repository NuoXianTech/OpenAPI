import { z } from 'zod'
import {
  atLeastOneFieldMessage,
  emailSchema,
  maxMessage,
  passwordSchema,
  positiveInt,
  usernameSchema
} from '#shared/schemas/validation'
import { displayNameSchema, optionalDate } from '../common'

export const adminBanUserSchema = z.object({
  id: positiveInt('用户 ID'),
  isBanned: z.boolean(),
  reason: z.string().trim().max(500, maxMessage('封禁原因', 500)).optional(),
  bannedUntil: optionalDate
}).refine(
  d => !d.isBanned || !d.bannedUntil || d.bannedUntil.getTime() > Date.now(),
  { message: '封禁到期时间必须晚于当前时间', path: ['bannedUntil'] }
)

export const adminCreateUserSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  displayName: displayNameSchema.optional(),
  isActive: z.boolean().optional()
})

export const adminUpdateUserSchema = z
  .object({
    id: positiveInt('用户 ID'),
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
    { message: atLeastOneFieldMessage(), path: [] }
  )
