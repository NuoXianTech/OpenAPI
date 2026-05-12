/**
 * 对外开放 API（/v{N}/*）业务码 + HTTP 状态映射。
 *
 * 命名空间约定：
 *   - 0           成功
 *   - 4xxxx       客户端错误，前 3 位对齐 HTTP status（40100=401, 42900=429）
 *   - 5xxxx       服务端错误
 *   - 6xxxx       业务侧失败（HTTP 仍 200，配合 markApiCallFailed 跳过扣费）
 *
 * 接入说明：handler 通过 openApiOk / openApiFail 输出本表中的码，
 * 中间件层（api-gate）的拒绝路径走 API_GUARD_ERROR 的 bizCode 映射。
 */

export const OPEN_API_CODE = {
  OK: 0,

  // 4xxxx
  BAD_REQUEST: 40000,
  MISSING_API_KEY: 40100,
  INVALID_API_KEY: 40101,
  REVOKED_API_KEY: 40102,
  EXPIRED_API_KEY: 40103,
  INSUFFICIENT_CREDITS: 40200,
  API_NOT_REGISTERED: 40300,
  SCOPE_DENIED: 40301,
  IP_DENIED: 40302,
  REFERER_DENIED: 40303,
  METHOD_NOT_ALLOWED: 40500,
  RATE_LIMITED: 42900,
  QUOTA_EXCEEDED: 42901,

  // 5xxxx
  INTERNAL_ERROR: 50000,
  UPSTREAM_ERROR: 50001,
  UPSTREAM_TIMEOUT: 50002,
  API_DISABLED: 50300,

  // 6xxxx · 业务失败（HTTP 200，handler 自定义；与 markApiCallFailed 搭配跳过扣费）
  BUSINESS_FAILED: 60000
} as const

export type OpenApiCode = (typeof OPEN_API_CODE)[keyof typeof OPEN_API_CODE]

/** 业务码 → 建议的 HTTP status（handler 可覆盖） */
export function httpStatusForCode(code: number): number {
  if (code === 0) return 200
  if (code >= 60000 && code < 70000) return 200 // 业务失败，HTTP 仍 200
  const prefix = Math.floor(code / 100) // 40100 → 401
  if (prefix >= 400 && prefix < 600) return prefix
  return 500
}
