/**
 * HTTP 响应状态码 → 语义色（UBadge / 文本配色）。
 *
 * 2xx 成功 · 4xx 客户端错误 · 5xx 服务端错误 · 其余（3xx 重定向、1xx 信息）中性。
 * 与 [http-method.ts] 同属 HTTP 展示助手；调用日志、概览最近调用等统一引用，避免各页重复且漂移。
 */
export type HttpStatusColor = 'success' | 'warning' | 'error' | 'neutral'

export function httpStatusColor(code: number): HttpStatusColor {
  if (code >= 500) return 'error'
  if (code >= 400) return 'warning'
  if (code >= 200 && code < 300) return 'success'
  return 'neutral'
}
