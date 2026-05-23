/**
 * 对外开放 API（/v{N}/*）统一响应壳。
 *
 * 结构（完全对齐 docs/restful-api-style.md §3，无项目私有扩展）：
 *   {
 *     code: string,        // 大写下划线机器可读标识（OK / MISSING_API_KEY ...）
 *     message: string,
 *     data: T | null,      // 失败时恒为 null
 *     timestamp: number    // ms
 *   }
 *
 * 用法：
 *   - 成功：return openApiOk(event, data)                            // code: 'OK', status: 200
 *   - 成功自定义文案：return openApiOk(event, data, '创建成功')        // code: 'OK', message 由 handler 决定
 *   - 失败：return openApiFail(event, 502, 'UPSTREAM_ERROR', '上游超时')
 *
 * X-Request-Id 走响应头：复用同名请求头，没有则生成 UUID，便于客户端排查。
 */

import type { H3Event } from 'h3'
import { getHeader, setResponseHeader, setResponseStatus } from 'h3'

export interface OpenApiResponse<T = unknown> {
  code: string
  message: string
  data: T | null
  timestamp: number
}

/** 复用请求头 X-Request-Id（无则生成 UUID），写回响应头并挂到 event.context，
 *  让 apiCalls.requestId 与响应头是同一个 ID（便于客户端报错时反查日志）。 */
function ensureRequestIdHeader(event: H3Event) {
  if (!event.context.requestId) {
    const incoming = getHeader(event, 'x-request-id')?.toString().trim()
    event.context.requestId = incoming || globalThis.crypto.randomUUID()
  }
  setResponseHeader(event, 'X-Request-Id', event.context.requestId)
}

export function openApiOk<T>(
  event: H3Event,
  data: T,
  message = 'ok'
): OpenApiResponse<T> {
  ensureRequestIdHeader(event)
  setResponseStatus(event, 200)
  return {
    code: 'OK',
    message,
    data,
    timestamp: Date.now()
  }
}

export function openApiFail(
  event: H3Event,
  status: number,
  code: string,
  message: string,
  data: unknown = null
): OpenApiResponse {
  ensureRequestIdHeader(event)
  setResponseStatus(event, status)
  return {
    code,
    message,
    data,
    timestamp: Date.now()
  }
}
