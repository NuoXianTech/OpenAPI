import { z } from 'zod'

// ============================================================
// User · Profile
// ============================================================

/** 用户更新自己的非敏感资料：displayName */
export const userUpdateProfileSchema = z.object({
  displayName: z.string().trim().max(32, '显示名最多 32 字')
})

/** 已登录用户改密码 */
export const userChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, '当前密码和新密码均必填'),
    newPassword: z.string().min(8, '新密码至少 8 位')
  })
  .refine(d => d.newPassword !== d.currentPassword, {
    message: '新密码与当前密码相同',
    path: ['newPassword']
  })

/** 已登录用户申请变更邮箱 */
export const userRequestEmailChangeSchema = z.object({
  newEmail: z.string().trim().toLowerCase().pipe(z.email('Invalid new email address'))
})

// ============================================================
// User · API Keys
// ============================================================

/** 用户给自己加 apikey */
export const userCreateApiKeySchema = z.object({
  name: z.string().trim().optional()
})

// ============================================================
// User · Credits
// ============================================================

/** 用户兑换码兑换 */
export const userRedeemCodeSchema = z.object({
  code: z.string().trim().min(1, '请输入兑换码')
})
