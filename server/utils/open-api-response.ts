/**
 * 对外开放 API（/v{N}/*）统一响应壳。
 *
 * 结构（完全对齐 docs/api/design-style.md §3，无项目私有扩展）：
 *   {
 *     code: string,        // 大写下划线机器可读标识（OK / MISSING_API_KEY ...）
 *     message: string,
 *     data: T | null,      // 失败时默认 null；必要时可放公开安全的结构化详情
 *     timestamp: number    // ms
 *   }
 *
 * 用法：
 *   - 成功：return openApiOk(event, data)                            // code: 'OK', status: 200
 *   - 成功自定义文案：return openApiOk(event, data, '创建成功')        // code: 'OK', message 由 handler 决定
 *   - 失败：return openApiFail(event, 502, 'UPSTREAM_ERROR', '上游超时')
 *   - 业务失败（标记+返回一行）：见 server/utils/api-call-outcome.ts 的 openApiBizFail
 *
 * X-Request-Id 走响应头：值取自 ensureRequestId（与 apiCalls.requestId 同源），便于客户端排查。
 */

import type { H3Event } from 'h3'
import { sendRedirect, setResponseHeader, setResponseHeaders, setResponseStatus } from 'h3'
import { ensureRequestId } from '~~/server/utils/request-id'
import { readQueryString } from '~~/server/utils/request-query'

export interface OpenApiResponse<T = unknown> {
  code: string
  message: string
  data: T | null
  timestamp: number
}

export interface OpenApiRawResponseOptions {
  contentType: string
  status?: number
  headers?: Record<string, string>
}

export type OpenApiOutputFormat = 'json' | 'text' | 'markdown'

export interface OpenApiRespondOptions<T> {
  message?: string
  text?: (data: T) => string
  markdown?: (data: T) => string
  headers?: Record<string, string>
}

export type OpenApiRespondResult<T> = OpenApiResponse<T> | string

function readOpenApiOutputFormat(query: Record<string, unknown>): OpenApiOutputFormat {
  const value = (readQueryString(query.encode).trim() || readQueryString(query.encoding).trim()).toLowerCase()
  if (value === 'text') return 'text'
  if (value === 'markdown' || value === 'md') return 'markdown'
  return 'json'
}

/** 写回响应头 X-Request-Id，让 apiCalls.requestId 与响应头是同一个 ID（便于反查日志）。 */
export function setOpenApiRequestIdHeader(event: H3Event): void {
  setResponseHeader(event, 'X-Request-Id', ensureRequestId(event))
}

/** 200 OK · 通用成功（GET/PUT/PATCH/DELETE 及无创建语义的 POST） */
export function openApiOk<T>(
  event: H3Event,
  data: T,
  message = 'ok'
): OpenApiResponse<T> {
  setOpenApiRequestIdHeader(event)
  setResponseStatus(event, 200)
  return {
    code: 'OK',
    message,
    data,
    timestamp: Date.now()
  }
}

export function openApiFail<T = unknown>(
  event: H3Event,
  status: number,
  code: string,
  message: string,
  data: T | null = null
): OpenApiResponse<T> {
  setOpenApiRequestIdHeader(event)
  setResponseStatus(event, status)
  return {
    code,
    message,
    data,
    timestamp: Date.now()
  }
}

/** 标准 JSON、纯文本和 Markdown 的统一内容协商出口。 */
export function openApiRespond<T>(
  event: H3Event,
  query: Record<string, unknown>,
  data: T,
  options: OpenApiRespondOptions<T> = {}
): OpenApiRespondResult<T> {
  const format = readOpenApiOutputFormat(query)
  if (format === 'json') {
    const response = openApiOk(event, data, options.message)
    if (options.headers) setResponseHeaders(event, options.headers)
    return response
  }

  const formatter = options[format]
  if (!formatter) {
    return openApiFail<T>(event, 406, 'FORMAT_NOT_SUPPORTED', `${format} 格式暂不支持`)
  }
  return openApiRaw(event, formatter(data), {
    contentType: format === 'markdown' ? 'text/markdown; charset=utf-8' : 'text/plain; charset=utf-8',
    headers: options.headers
  })
}

/** 直出文本、HTML 或二进制表示，同时保留公共接口的请求追踪头。 */
export function openApiRaw<T>(
  event: H3Event,
  body: T,
  options: OpenApiRawResponseOptions
): T {
  setOpenApiRequestIdHeader(event)
  setResponseStatus(event, options.status ?? 200)
  setResponseHeader(event, 'Content-Type', options.contentType)
  if (options.headers) setResponseHeaders(event, options.headers)
  return body
}

/** 公共接口重定向，自动补充与调用日志一致的请求 ID。 */
export function openApiRedirect(
  event: H3Event,
  location: string,
  status = 302
): ReturnType<typeof sendRedirect> {
  setOpenApiRequestIdHeader(event)
  return sendRedirect(event, location, status)
}
