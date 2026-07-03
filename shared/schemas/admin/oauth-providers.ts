import { z } from 'zod'

export const adminUpdateOauthProviderSchema = z.object({
  provider: z.string().trim().toLowerCase().min(1, 'provider 不合法，仅支持 github / qq'),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  isEnabled: z.boolean().optional()
})
