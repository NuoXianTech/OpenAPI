export const API_ACCESS_ERROR = {
  METHOD_NOT_ALLOWED: { status: 405, code: 'METHOD_NOT_ALLOWED', msg: '请求方法不受支持' },
  MISSING_API_KEY: { status: 401, code: 'MISSING_API_KEY', msg: '缺少 x-api-key 请求头' },
  INVALID_API_KEY: { status: 401, code: 'INVALID_API_KEY', msg: '无效的 API Key' },
  DISABLED_API_KEY: { status: 401, code: 'DISABLED_API_KEY', msg: 'API Key 已被禁用' },
  EXPIRED_API_KEY: { status: 401, code: 'EXPIRED_API_KEY', msg: 'API Key 已过期' },
  SCOPE_DENIED: { status: 403, code: 'SCOPE_DENIED', msg: 'API Key 无权调用该接口' },
  IP_DENIED: { status: 403, code: 'IP_DENIED', msg: '当前 IP 不在白名单内' },
  RATE_LIMITED: { status: 429, code: 'RATE_LIMITED', msg: '请求过于频繁，请稍后再试' },
  RATE_LIMIT_UNAVAILABLE: { status: 503, code: 'RATE_LIMIT_UNAVAILABLE', msg: '限流服务暂不可用，请稍后再试' },
  API_KEY_QUOTA_EXCEEDED: { status: 429, code: 'API_KEY_QUOTA_EXCEEDED', msg: '积分配额超限' },
  CREDITS_UNAVAILABLE: { status: 503, code: 'CREDITS_UNAVAILABLE', msg: '积分服务暂不可用，请稍后再试' },
  INSUFFICIENT_CREDITS: { status: 402, code: 'INSUFFICIENT_CREDITS', msg: '积分不足，请充值后再试' }
} as const

export const RATE_LIMIT_WINDOW_SECONDS = {
  second: 1,
  minute: 60,
  hour: 3_600,
  day: 86_400
} as const

export type RateLimitWindow = keyof typeof RATE_LIMIT_WINDOW_SECONDS
