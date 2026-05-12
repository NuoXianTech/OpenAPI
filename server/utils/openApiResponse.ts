/**
 * 对外开放 API（/v{N}/*）统一响应壳。
 *
 * 结构：
 *   {
 *     code: number,        // 0=成功，详见 OPEN_API_CODE
 *     message: string,
 *     data: T | null,
 *     requestId: string,
 *     timestamp: number    // ms
 *   }
 *
 * 用法：
 *   - 成功：return openApiOk(event, data)
 *   - 失败：return openApiFail(event, OPEN_API_CODE.UPSTREAM_TIMEOUT, '上游超时')
 *
 * 注意：HTTP status 由 httpStatusForCode(code) 自动推导，handler 极少需要手动覆盖。
 */

import type { H3Event } from 'h3'
import { getHeader, setResponseHeader, setResponseStatus } from 'h3'
import { OPEN_API_CODE, httpStatusForCode } from '~~/shared/config/openApiCodes'

export interface OpenApiResponse<T = unknown> {
  code: number
  message: string
  data: T | null
  requestId: string
  timestamp: number
}

/** 复用 X-Request-Id 请求头，没有则生成。同时回写到响应头便于客户端排查。 */
function ensureRequestId(event: H3Event): string {
  const incoming = getHeader(event, 'x-request-id')?.toString().trim()
  const id = incoming || globalThis.crypto.randomUUID()
  setResponseHeader(event, 'X-Request-Id', id)
  return id
}

export function openApiOk<T>(event: H3Event, data: T, message = 'ok'): OpenApiResponse<T> {
  setResponseStatus(event, 200)
  return {
    code: OPEN_API_CODE.OK,
    message,
    data,
    requestId: ensureRequestId(event),
    timestamp: Date.now()
  }
}

export function openApiFail(
  event: H3Event,
  code: number,
  message: string,
  data: unknown = null,
  httpStatus?: number
): OpenApiResponse {
  setResponseStatus(event, httpStatus ?? httpStatusForCode(code))
  return {
    code,
    message,
    data,
    requestId: ensureRequestId(event),
    timestamp: Date.now()
  }
}
