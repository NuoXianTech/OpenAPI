import { z } from 'zod'
import { emailSchema, passwordSchema, usernameSchema } from '../validation'

/**
 * 初始管理员引导。
 *
 * 只有密码是必填：出厂口令由启动流程随机生成并打进日志，必须轮换。
 * 用户名与邮箱允许留空以保持默认——`admin` 这个用户名公开并不构成漏洞，
 * 口令才是凭据边界。留空即不改动对应字段。
 */
export const adminInitialProfileSchema = z.object({
  username: usernameSchema.optional(),
  email: emailSchema.optional(),
  password: passwordSchema
}).strict()
