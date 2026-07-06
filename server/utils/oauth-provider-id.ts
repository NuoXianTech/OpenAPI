import { SUPPORTED_OAUTH_PROVIDERS, type SupportedOauthProvider } from '~~/shared/types/oauth'

export function isSupportedOauthProvider(value: unknown): value is SupportedOauthProvider {
  return typeof value === 'string' && (SUPPORTED_OAUTH_PROVIDERS as readonly string[]).includes(value)
}

export function providerIndex(provider: SupportedOauthProvider): number {
  return SUPPORTED_OAUTH_PROVIDERS.indexOf(provider)
}

export function providerByIndex(index: number): SupportedOauthProvider | null {
  return SUPPORTED_OAUTH_PROVIDERS[index] ?? null
}
