/**
 * 对外开放 API（/v{N}/*）统一响应壳。
 *
 * 结构（完全对齐 docs/api/style.md §3，无项目私有扩展）：
 *   {
 *     code: string,        // 大写下划线机器可读标识（OK / CREATED / MISSING_API_KEY ...）
 *     message: string,
 *     data: T | null,      // 失败时恒为 null
 *     timestamp: number    // ms
 *   }
 *
 * 用法：
 *   - 成功：return openApiOk(event, data)                            // code: 'OK', status: 200
 *   - 成功自定义文案：return openApiOk(event, data, '创建成功')        // code: 'OK', message 由 handler 决定
 *   - 创建成功：return openApiCreated(event, data)                   // code: 'CREATED', status: 201（restful §4.1）
 *   - 失败：return openApiFail(event, 502, 'UPSTREAM_ERROR', '上游超时')
 *   - 业务失败（标记+返回一行）：见 server/utils/api-call-outcome.ts 的 openApiBizFail
 *
 * X-Request-Id 走响应头：值取自 ensureRequestId（与 apiCalls.requestId 同源），便于客户端排查。
 */

import type { H3Event } from 'h3'
import { setResponseHeader, setResponseStatus } from 'h3'
import { ensureRequestId } from '~~/server/utils/request-id'

export interface OpenApiResponse<T = unknown> {
  code: string
  message: string
  data: T | null
  timestamp: number
}

/** 写回响应头 X-Request-Id，让 apiCalls.requestId 与响应头是同一个 ID（便于反查日志）。 */
function setRequestIdHeader(event: H3Event) {
  setResponseHeader(event, 'X-Request-Id', ensureRequestId(event))
}

/** 成功响应内部构造器 · openApiOk / openApiCreated 共用，避免响应壳样板重复。 */
function buildSuccess<T>(
  event: H3Event,
  data: T,
  message: string,
  status: number,
  code: string
): OpenApiResponse<T> {
  setRequestIdHeader(event)
  setResponseStatus(event, status)
  return {
    code,
    message,
    data,
    timestamp: Date.now()
  }
}

/** 200 OK · 通用成功（GET/PUT/PATCH/DELETE 及无创建语义的 POST） */
export function openApiOk<T>(
  event: H3Event,
  data: T,
  message = 'ok'
): OpenApiResponse<T> {
  return buildSuccess(event, data, message, 200, 'OK')
}

/** 201 Created · POST 新建资源成功（docs/api/style.md §4.1），code 固定 'CREATED' 与 'OK' 区分 */
export function openApiCreated<T>(
  event: H3Event,
  data: T,
  message = 'created'
): OpenApiResponse<T> {
  return buildSuccess(event, data, message, 201, 'CREATED')
}

export function openApiFail(
  event: H3Event,
  status: number,
  code: string,
  message: string,
  data: unknown = null
): OpenApiResponse {
  setRequestIdHeader(event)
  setResponseStatus(event, status)
  return {
    code,
    message,
    data,
    timestamp: Date.now()
  }
}
