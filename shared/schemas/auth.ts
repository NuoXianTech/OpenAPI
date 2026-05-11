import { z } from 'zod'

/** 注册：用户名 / 邮箱 / 密码 / Turnstile 令牌 */
export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, '用户名至少 3 位')
    .max(32, '用户名最多 32 位')
    .regex(/^[a-zA-Z0-9_-]+$/, '只能包含字母、数字、下划线和短横线'),
  email: z.string().trim().toLowerCase().pipe(z.email('请输入有效的邮箱地址')),
  password: z.string().min(8, '密码至少 8 位'),
  turnstileToken: z.string().optional(),
})
export type RegisterInput = z.output<typeof registerSchema>

/** 登录：邮箱或用户名其一 + 密码 + 可选 remember / Turnstile */
export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().optional(),
    username: z.string().trim().optional(),
    password: z.string().min(1, '请输入密码'),
    remember: z.boolean().optional(),
    turnstileToken: z.string().optional(),
  })
  .refine(d => Boolean(d.email || d.username), {
    message: 'email or username is required',
    path: ['email'],
  })
export type LoginInput = z.output<typeof loginSchema>

/** 申请重置密码：邮箱 + Turnstile */
export const requestPasswordResetSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('请输入有效的邮箱地址')),
  turnstileToken: z.string().optional(),
})
export type RequestPasswordResetInput = z.output<typeof requestPasswordResetSchema>

/** 消费 reset_password token 设置新密码：userId 接受数字字符串以兼容 query 透传 */
export const resetPasswordSchema = z.object({
  userId: z.coerce.number().int().positive('Invalid user id'),
  token: z.string().min(1, '缺少重置令牌'),
  newPassword: z.string().min(8, '密码至少 8 位'),
})
export type ResetPasswordInput = z.output<typeof resetPasswordSchema>
