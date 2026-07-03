import { z } from 'zod'
import { emailSchema, passwordSchema, usernameSchema } from './common'
import { positiveInt } from './validation'

export const registerSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  turnstileToken: z.string().optional()
})
export type RegisterInput = z.output<typeof registerSchema>

export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().optional(),
    username: z.string().trim().optional(),
    password: z.string().min(1, '请输入密码'),
    remember: z.boolean().optional(),
    turnstileToken: z.string().optional()
  })
  .refine(d => Boolean(d.email || d.username), {
    message: '请输入邮箱或用户名',
    path: ['email']
  })
export type LoginInput = z.output<typeof loginSchema>

export const oauthBindSchema = z.object({
  identifier: z.string().trim().min(1, '请输入邮箱或用户名'),
  password: z.string().min(1, '请输入密码'),
  turnstileToken: z.string().optional()
})

export const oauthRegisterSchema = z.object({
  email: emailSchema,
  username: usernameSchema.optional(),
  password: passwordSchema,
  turnstileToken: z.string().optional()
})

export const requestPasswordResetSchema = z.object({
  email: emailSchema,
  turnstileToken: z.string().optional()
})
export type RequestPasswordResetInput = z.output<typeof requestPasswordResetSchema>

export const resetPasswordSchema = z.object({
  userId: positiveInt('用户 ID'),
  token: z.string().min(1, '缺少重置令牌'),
  newPassword: passwordSchema
})
export type ResetPasswordInput = z.output<typeof resetPasswordSchema>

export const confirmEmailChangeSchema = z.object({
  userId: positiveInt('用户 ID'),
  token: z.string().min(1, '缺少确认令牌')
})
export type ConfirmEmailChangeInput = z.output<typeof confirmEmailChangeSchema>
