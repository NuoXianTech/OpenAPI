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
import { atLeastOneFieldMessage, minMessage, positiveInt, requiredMessage } from '../../shared/schemas/validation'

// Profile
export const userUpdateProfileSchema = z.object({
  displayName: displayNameSchema
})

export const userChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, '当前密码和新密码均必填'),
    newPassword: z.string().min(8, minMessage('新密码', 8))
  })
  .refine(d => d.newPassword !== d.currentPassword, {
    message: '新密码与当前密码相同',
    path: ['newPassword']
  })

export const userRequestEmailChangeSchema = z.object({
  currentPassword: z.string().min(1, '请输入当前密码'),
  newEmail: z.string().trim().toLowerCase().pipe(z.email('请输入有效的新邮箱地址'))
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

export const userUpdateApiKeySchema = z.object({
  id: positiveInt('API Key ID'),
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
  { message: atLeastOneFieldMessage(), path: [] }
)

// Credits
export const userRedeemCodeSchema = z.object({
  code: z.string().trim().min(1, requiredMessage('兑换码'))
})
