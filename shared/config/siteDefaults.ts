/**
 * 站点公开字段的默认值唯一来源。
 *
 * - DB schema 的 `.default()`、service 兜底插入、前端 useSiteSettings 的 FALLBACK 都从这里取值，
 *   避免三处漂移。
 * - 仅放公开字段（前端可能展示 / 兜底使用），SMTP、session 等纯服务端字段仍由 schema 自身的 `.default()` 兜底。
 */
export const PUBLIC_SITE_DEFAULTS = {
  siteUrl: 'http://localhost:3000',
  siteImg: '/favicon.ico',
  siteName: 'OpenAPI',
  siteDescription: 'OpenAPI是免费为用户提供网络数据接口调用的服务平台。',
  startTime: '2026-01-01 00:00:00',
  passwordResetEnabled: true
} as const
