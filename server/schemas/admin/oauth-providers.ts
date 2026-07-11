import { z } from 'zod'
import { SUPPORTED_OAUTH_PROVIDERS } from '#shared/types/oauth'

export const adminUpdateOauthProviderSchema = z.object({
  provider: z.string().trim().toLowerCase().min(1, 'provider 不合法，仅支持 github / qq'),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  isEnabled: z.boolean().optional()
})

const adminOauthProviderBatchItemSchema = z.object({
  provider: z.enum(SUPPORTED_OAUTH_PROVIDERS),
  clientId: z.string(),
  clientSecret: z.string().optional(),
  isEnabled: z.boolean()
})

export const adminUpdateOauthProvidersSchema = z.object({
  oauthForceBinding: z.boolean(),
  providers: z.array(adminOauthProviderBatchItemSchema)
    .length(SUPPORTED_OAUTH_PROVIDERS.length, '必须提交全部第三方登录配置')
}).superRefine((data, context) => {
  const providers = new Set(data.providers.map(item => item.provider))
  if (providers.size !== SUPPORTED_OAUTH_PROVIDERS.length) {
    context.addIssue({
      code: 'custom',
      message: '第三方登录配置存在重复或缺失的 provider',
      path: ['providers']
    })
  }
})
