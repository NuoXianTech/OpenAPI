/**
 * 请求级 X-Request-Id 的初始化 · 请求阶段与响应阶段共用的单一来源。
 *
 * 复用请求头 X-Request-Id（trim 后），缺失则生成 UUID，写入 event.context.requestId。
 * 幂等：已存在则直接返回，不覆盖。
 *
 * 保证 apiCalls.requestId（apiCallStats plugin 在请求阶段写）与响应头 X-Request-Id
 * （openApiResponse 在响应阶段写）是同一个值，便于客户端报错时反查调用日志。
 *
 * 应用自有的请求上下文字段集中在 server/types/api-access.ts。
 */

import type { H3Event } from 'h3'
import { getHeader } from 'h3'
import { getAppEventContext } from '~~/server/utils/event-context'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function normalizeRequestId(value: string | null | undefined): string | null {
  const normalized = value?.trim()
  return normalized && UUID_PATTERN.test(normalized) ? normalized.toLowerCase() : null
}

export function ensureRequestId(event: H3Event): string {
  const context = getAppEventContext(event)
  if (!context.requestId) {
    const incoming = normalizeRequestId(getHeader(event, 'x-request-id')?.toString())
    context.requestId = incoming ?? globalThis.crypto.randomUUID()
  }
  return context.requestId
}
