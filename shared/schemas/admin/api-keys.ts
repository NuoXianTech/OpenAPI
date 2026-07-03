import { z } from 'zod'
import {
  apiKeyCidrSchema,
  apiKeyCreateCountSchema,
  apiKeyNameSchema,
  apiKeyScopeSchema,
  apiKeyTotalQuotaSchema,
  nullableArraySchema
} from '../api-key'
import { optionalDate } from '../common'

export const adminCreateUserApiKeySchema = z.object({
  userId: z.coerce.number().int().positive('userId is required'),
  name: apiKeyNameSchema.optional(),
  expiresAt: optionalDate,
  totalQuota: apiKeyTotalQuotaSchema,
  scopes: nullableArraySchema(apiKeyScopeSchema, 200),
  ipWhitelist: nullableArraySchema(apiKeyCidrSchema, 200),
  count: apiKeyCreateCountSchema
})
export type AdminCreateUserApiKeyInput = z.output<typeof adminCreateUserApiKeySchema>

export const adminUpdateUserApiKeySchema = z.object({
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
export type AdminUpdateUserApiKeyInput = z.output<typeof adminUpdateUserApiKeySchema>
