// Public site defaults shared by DB schema, service fallback, and frontend fallback.
export const PUBLIC_SITE_DEFAULTS = {
  siteUrl: 'http://localhost:3000',
  siteImg: '/favicon.ico',
  siteName: 'OpenAPI',
  siteDescription: 'OpenAPI是免费为用户提供网络数据接口调用的服务平台，我们致力于为用户提供稳定、快速的免费API数据接口服务。',
  startTime: '2026-01-01 00:00:00',
  passwordResetEnabled: true
} as const
