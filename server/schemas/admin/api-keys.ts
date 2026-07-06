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
import { atLeastOneFieldMessage, positiveInt } from '../../../shared/schemas/validation'

export const adminCreateUserApiKeySchema = z.object({
  userId: positiveInt('用户 ID'),
  name: apiKeyNameSchema.optional(),
  expiresAt: optionalDate,
  totalQuota: apiKeyTotalQuotaSchema,
  scopes: nullableArraySchema(apiKeyScopeSchema, 200),
  ipWhitelist: nullableArraySchema(apiKeyCidrSchema, 200),
  count: apiKeyCreateCountSchema
})

export const adminUpdateUserApiKeySchema = z.object({
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
