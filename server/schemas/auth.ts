import { z } from 'zod'
import type {
  ConfirmEmailChangeInput,
  LoginInput,
  OauthRegisterInput,
  RegisterInput,
  RequestPasswordResetInput,
  ResetPasswordInput,
  VerifyEmailInput
} from '#shared/types/auth'
import { emailSchema, passwordSchema, positiveInt, usernameSchema } from './validation'

export const registerSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  inviteCode: z.string().trim().max(256).optional(),
  turnstileToken: z.string().optional()
}) satisfies z.ZodType<RegisterInput>

export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().optional(),
    username: z.string().trim().optional(),
    password: z.string().min(1, '请输入密码'),
    remember: z.boolean().optional(),
    turnstileToken: z.string().optional()
  })
  .refine(data => Boolean(data.email || data.username), {
    message: '请输入邮箱或用户名',
    path: ['email']
  }) satisfies z.ZodType<LoginInput>

export const oauthBindSchema = z.object({
  identifier: z.string().trim().min(1, '请输入邮箱或用户名'),
  password: z.string().min(1, '请输入密码'),
  turnstileToken: z.string().optional()
})

export const oauthRegisterSchema = z.object({
  email: emailSchema,
  username: usernameSchema.optional(),
  password: passwordSchema,
  inviteCode: z.string().trim().max(256).optional(),
  turnstileToken: z.string().optional()
}) satisfies z.ZodType<OauthRegisterInput>

export const requestPasswordResetSchema = z.object({
  email: emailSchema,
  turnstileToken: z.string().optional()
}) satisfies z.ZodType<RequestPasswordResetInput>

export const resetPasswordSchema = z.object({
  userId: positiveInt('用户 ID'),
  token: z.string().min(1, '缺少重置令牌'),
  newPassword: passwordSchema
}) satisfies z.ZodType<ResetPasswordInput>

export const confirmEmailChangeSchema = z.object({
  userId: positiveInt('用户 ID'),
  token: z.string().min(1, '缺少确认令牌')
}) satisfies z.ZodType<ConfirmEmailChangeInput>

export const verifyEmailSchema = z.object({
  userId: positiveInt('用户 ID'),
  token: z.string().min(1, '缺少验证令牌')
}) satisfies z.ZodType<VerifyEmailInput>
