import { z } from 'zod'
import { maxMessage, minMessage } from './validation'

export const usernameSchema = z
  .string()
  .trim()
  .min(3, minMessage('用户名', 3))
  .max(32, maxMessage('用户名', 32, '位'))
  .regex(/^[a-zA-Z0-9_-]+$/, '只能包含字母、数字、下划线和短横线')

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email('请输入有效的邮箱地址'))

export const passwordSchema = z.string().min(8, minMessage('密码', 8))
