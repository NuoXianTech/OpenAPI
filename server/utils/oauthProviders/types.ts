export interface ProviderConfig {
  clientId: string
  clientSecret: string
  callbackUrl: string
}

export interface ProviderProfile {
  providerUserId: string
  email: string | null
  nickname: string | null
  avatarUrl: string | null
  profileRaw: Record<string, unknown>
}

/**
 * 仅作回调流程内的临时载体：
 * 项目用 OAuth 仅用于身份识别，不调用上游 API，因此 access_token 用完即丢，
 * refresh_token / scope / 过期时间不再持久化。
 */
export interface TokenResult {
  accessToken: string
}

/**
 * 单个 OAuth provider 的实现契约。
 * 每个具体 provider 模块导出一个 OauthProviderModule 实例（如 githubProvider / qqProvider），
 * 用对象命名空间避免顶层同名 export 触发 nitro auto-import 冲突警告。
 */
export interface OauthProviderModule {
  buildAuthorizeUrl(config: ProviderConfig, state: string): string
  exchangeCode(config: ProviderConfig, code: string): Promise<TokenResult>
  fetchUserInfo(config: ProviderConfig, accessToken: string, token: TokenResult): Promise<ProviderProfile>
}
