/**
 * API 治理层通用常量：治理前缀、默认值、错误文案。
 *
 * 说明：
 * - 本文件被 shared/types/server/middleware 多处引用，不要引入任何运行时依赖。
 * - 治理范围由 `VERSION_CODE_PATTERN` 直接判定（避免误伤 /version、/vault 等无关路径）。
 * - 公开 API 直接挂在 /v{N}/<code>/...，不再使用 /api/ 前缀（实现位置：server/routes/v{N}/）。
 */

/**
 * 从 pathname 提取 (pathVersion, code)。
 * 例：/v1/user/42/posts → { pathVersion: 'v1', code: 'user' }
 */
export const VERSION_CODE_PATTERN = /^\/(v\d+)\/([^/?#]+)/

/** 判断一段 URL 是否处于治理范围（命中 /v{N}/<code> 形式即视为治理路径） */
export function isGuardedPath(pathname: string): boolean {
  return VERSION_CODE_PATTERN.test(pathname)
}

/**
 * 一键登记的默认治理配置（公开 API 定位）：
 * - isEnabled=false：登记后仍需管理员显式启用，避免误放
 * - isApiKey=false：公开可访问，ApiKey 为可选增强
 * - isStatistics=true：默认开启调用统计，管理员可在后台关闭
 * - status=-1：未知（接口未启用前不应预设为正常）
 * - rateLimitPerMinute=60：默认防刷
 */
export const DEFAULT_API_REGISTRATION = {
  status: -1,
  isEnabled: false,
  isApiKey: false,
  isStatistics: true,
  rateLimitPerSecond: 0,
  rateLimitPerMinute: 60,
  rateLimitPerHour: 1000,
  rateLimitPerDay: 0,
  dailyQuota: 0,
  methodCosts: {} as Record<string, number>,
  timeoutMs: 10_000
} as const

/**
 * gate 拒绝路径的错误定义 · 仅 server/middleware/00.api-gate.ts 使用。
 *
 * - `status`：HTTP 状态码（响应行）
 * - `code`：响应 body `code` 字段的字符串标识（SCREAMING_SNAKE_CASE），客户端用来区分同 status 下的子类型
 * - `msg`：响应 body `message` 字段的默认中文文案 —— 仅 gate 层使用，业务 handler 用自定义文案
 *
 * 业务 handler 内部的错误码不必登记到这里，inline 字面量即可（详见 docs/api-conventions.md §4）。
 */
export const API_GUARD_ERROR = {
  NOT_REGISTERED: { status: 403, code: 'API_NOT_REGISTERED', msg: '接口未登记，请联系管理员' },
  DISABLED: { status: 503, code: 'API_DISABLED', msg: '接口已停用' },
  METHOD_NOT_ALLOWED: { status: 405, code: 'METHOD_NOT_ALLOWED', msg: '请求方法不受支持' },
  MISSING_API_KEY: { status: 401, code: 'MISSING_API_KEY', msg: '缺少 x-api-key 请求头' },
  INVALID_API_KEY: { status: 401, code: 'INVALID_API_KEY', msg: '无效的 API Key' },
  REVOKED_API_KEY: { status: 401, code: 'REVOKED_API_KEY', msg: 'API Key 已停用或撤销' },
  EXPIRED_API_KEY: { status: 401, code: 'EXPIRED_API_KEY', msg: 'API Key 已过期' },
  SCOPE_DENIED: { status: 403, code: 'SCOPE_DENIED', msg: 'API Key 无权调用该接口' },
  IP_DENIED: { status: 403, code: 'IP_DENIED', msg: '当前 IP 不在白名单内' },
  RATE_LIMITED: { status: 429, code: 'RATE_LIMITED', msg: '请求过于频繁，请稍后再试' },
  QUOTA_EXCEEDED: { status: 429, code: 'QUOTA_EXCEEDED', msg: '已达到当日配额上限' },
  API_KEY_QUOTA_EXCEEDED: { status: 429, code: 'API_KEY_QUOTA_EXCEEDED', msg: '积分配额超限' },
  INSUFFICIENT_CREDITS: { status: 402, code: 'INSUFFICIENT_CREDITS', msg: '积分不足，请充值后再试' }
} as const

/** API 元数据缓存 TTL（服务层 LRU） */
export const API_META_CACHE_TTL_MS = 15_000

/**
 * 按 HTTP method 在 methodCosts 中查到本次调用的扣费金额。
 * - methodCosts 缺省 / 缺少该 method → 0（免费）
 * - method 大小写不敏感，内部归一化为大写
 */
export function resolveMethodCost(
  methodCosts: Record<string, number> | null | undefined,
  method: string
): number {
  if (!methodCosts) return 0
  const value = methodCosts[method.toUpperCase()]
  return typeof value === 'number' && value > 0 ? value : 0
}

/** 判断 methodCosts 中是否存在任意一个 > 0 的方法（即整组接口至少有一个方法是收费的） */
export function hasAnyChargedMethod(methodCosts: Record<string, number> | null | undefined): boolean {
  if (!methodCosts) return false
  for (const value of Object.values(methodCosts)) {
    if (typeof value === 'number' && value > 0) return true
  }
  return false
}

/**
 * 限流 driver 可选项。
 * - memory：进程内（dev / 单实例）
 * - postgres：基于 api_rate_limit_buckets 表的原子 upsert，多实例 Node 部署用
 * - kv：基于 Nitro `useStorage('cache')`，NuxtHub / Cloudflare / Vercel 等 serverless 部署用
 */
export const RATE_LIMIT_DRIVERS = ['memory', 'postgres', 'kv'] as const
export type RateLimitDriverName = typeof RATE_LIMIT_DRIVERS[number]

/** 限流窗口维度 */
export const RATE_LIMIT_WINDOWS = ['second', 'minute', 'hour', 'day'] as const
export type RateLimitWindow = typeof RATE_LIMIT_WINDOWS[number]

export const RATE_LIMIT_WINDOW_SECONDS: Record<RateLimitWindow, number> = {
  second: 1,
  minute: 60,
  hour: 3_600,
  day: 86_400
}
