import { z } from 'zod'

export const adminLoginSchema = z.object({
  username: z.string().trim().min(1, '请输入管理员账号'),
  password: z.string().min(1, '请输入管理员密码'),
  remember: z.boolean().optional(),
  turnstileToken: z.string().optional()
})
