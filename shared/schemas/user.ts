import { z } from 'zod'
import {
  apiKeyCidrSchema,
  apiKeyCreateCountSchema,
  apiKeyNameSchema,
  apiKeyScopeSchema,
  apiKeyTotalQuotaSchema,
  nullableArraySchema
} from './api-key'
import {
  displayNameSchema,
  optionalDate
} from './common'

// Profile
export const userUpdateProfileSchema = z.object({
  displayName: displayNameSchema
})

export const userChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, '当前密码和新密码均必填'),
    newPassword: z.string().min(8, '新密码至少 8 位')
  })
  .refine(d => d.newPassword !== d.currentPassword, {
    message: '新密码与当前密码相同',
    path: ['newPassword']
  })

export const userRequestEmailChangeSchema = z.object({
  currentPassword: z.string().min(1, '请输入当前密码'),
  newEmail: z.string().trim().toLowerCase().pipe(z.email('Invalid new email address'))
})

// API keys
export const userCreateApiKeySchema = z.object({
  name: apiKeyNameSchema.optional(),
  expiresAt: optionalDate,
  totalQuota: apiKeyTotalQuotaSchema,
  scopes: nullableArraySchema(apiKeyScopeSchema, 200),
  ipWhitelist: nullableArraySchema(apiKeyCidrSchema, 200),
  count: apiKeyCreateCountSchema
})
export type UserCreateApiKeyInput = z.output<typeof userCreateApiKeySchema>

export const userUpdateApiKeySchema = z.object({
  id: z.coerce.number().int().positive('id is required'),
  name: apiKeyNameSchema.optional(),
  expiresAt: optionalDate,
  totalQuota: apiKeyTotalQuotaSchema,
  scopes: nullableArraySchema(apiKeyScopeSchema, 200),
  ipWhitelist: nullableArraySchema(apiKeyCidrSchema, 200),
  isActive: z.boolean().optional()
}).refine(
  d => d.name !== undefined
    || d.expiresAt !== undefined
    || d.totalQuota !== undefined
    || d.scopes !== undefined
    || d.ipWhitelist !== undefined
    || d.isActive !== undefined,
  { message: '至少需要修改一个字段', path: [] }
)
export type UserUpdateApiKeyInput = z.output<typeof userUpdateApiKeySchema>

// Credits
export const userRedeemCodeSchema = z.object({
  code: z.string().trim().min(1, '请输入兑换码')
})
