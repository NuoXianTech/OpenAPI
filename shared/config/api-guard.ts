// Imported by app and server code; keep this file runtime-dependency free.

export const VERSION_CODE_PATTERN = /^\/(v\d+)\/([^/?#]+)/

export function isGuardedPath(pathname: string): boolean {
  return VERSION_CODE_PATTERN.test(pathname)
}

export function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1)
  return pathname
}

export const DEFAULT_API_REGISTRATION = {
  status: -1,
  isEnabled: false,
  isApiKey: false,
  isStatistics: false,
  rateLimitPerSecond: 0,
  rateLimitPerMinute: 60,
  rateLimitPerHour: 1000,
  rateLimitPerDay: 0,
  dailyQuota: 0,
  methodCosts: {} as Record<string, number>,
  timeoutMs: 10_000
} as const

export const API_GUARD_ERROR = {
  NOT_REGISTERED: { status: 403, code: 'API_NOT_REGISTERED', msg: '接口未登记，请联系管理员' },
  DISABLED: { status: 503, code: 'API_DISABLED', msg: '接口已停用' },
  METHOD_NOT_ALLOWED: { status: 405, code: 'METHOD_NOT_ALLOWED', msg: '请求方法不受支持' },
  MISSING_API_KEY: { status: 401, code: 'MISSING_API_KEY', msg: '缺少 x-api-key 请求头' },
  INVALID_API_KEY: { status: 401, code: 'INVALID_API_KEY', msg: '无效的 API Key' },
  DISABLED_API_KEY: { status: 401, code: 'DISABLED_API_KEY', msg: 'API Key 已被禁用' },
  EXPIRED_API_KEY: { status: 401, code: 'EXPIRED_API_KEY', msg: 'API Key 已过期' },
  SCOPE_DENIED: { status: 403, code: 'SCOPE_DENIED', msg: 'API Key 无权调用该接口' },
  IP_DENIED: { status: 403, code: 'IP_DENIED', msg: '当前 IP 不在白名单内' },
  RATE_LIMITED: { status: 429, code: 'RATE_LIMITED', msg: '请求过于频繁，请稍后再试' },
  QUOTA_EXCEEDED: { status: 429, code: 'QUOTA_EXCEEDED', msg: '已达到当日配额上限' },
  API_KEY_QUOTA_EXCEEDED: { status: 429, code: 'API_KEY_QUOTA_EXCEEDED', msg: '积分配额超限' },
  INSUFFICIENT_CREDITS: { status: 402, code: 'INSUFFICIENT_CREDITS', msg: '积分不足，请充值后再试' }
} as const

export const API_META_CACHE_TTL_MS = 15_000

export function resolveMethodCost(
  methodCosts: Record<string, number> | null | undefined,
  method: string
): number {
  if (!methodCosts) return 0
  const value = methodCosts[method.toUpperCase()]
  return typeof value === 'number' && value > 0 ? value : 0
}

export function hasAnyChargedMethod(methodCosts: Record<string, number> | null | undefined): boolean {
  if (!methodCosts) return false
  for (const value of Object.values(methodCosts)) {
    if (typeof value === 'number' && value > 0) return true
  }
  return false
}

export const RATE_LIMIT_WINDOW_SECONDS = {
  second: 1,
  minute: 60,
  hour: 3_600,
  day: 86_400
} as const
export type RateLimitWindow = keyof typeof RATE_LIMIT_WINDOW_SECONDS
