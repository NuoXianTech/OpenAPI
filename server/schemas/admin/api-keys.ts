import { z } from 'zod'
import {
  apiKeyCreateFields,
  apiKeyUpdateFields,
  hasApiKeyUpdateField
} from '../api-key'
import { atLeastOneFieldMessage, positiveInt } from '../validation'

export const adminCreateUserApiKeySchema = z.object({
  userId: positiveInt('用户 ID'),
  ...apiKeyCreateFields
})

export const adminUpdateUserApiKeySchema = z.object({
  id: positiveInt('API Key ID'),
  ...apiKeyUpdateFields
}).refine(
  hasApiKeyUpdateField,
  { message: atLeastOneFieldMessage(), path: [] }
)
