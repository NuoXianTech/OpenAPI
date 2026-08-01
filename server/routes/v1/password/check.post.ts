/**
 * POST /v1/password/check · 检测密码强度，不回显或记录明文密码。
 *
 * Body:
 *   { password: string }
 *
 * Query:
 *   encode|encoding  json|text|markdown|md，默认 json
 */

import type { H3Event } from 'h3'
import { getQuery, readBody, setResponseHeader, setResponseHeaders } from 'h3'
import {
  checkPasswordStrength,
  formatPasswordCheckMarkdown,
  formatPasswordCheckText,
  isPasswordCheckEncoding,
  parsePasswordCheckBody,
  type PasswordCheckEncoding
} from '~~/server/lib/password-check'
import { openApiFail, openApiOk } from '~~/server/utils/open-api-response'
import { ensureRequestId } from '~~/server/utils/request-id'
import { readQueryString } from '~~/server/utils/request-query'

function parseEncoding(query: Record<string, unknown>): PasswordCheckEncoding {
  const value = readQueryString(query.encode || query.encoding).trim().toLowerCase()
  return isPasswordCheckEncoding(value) ? value : 'json'
}

export default defineOpenApiEventHandler(async (event: H3Event) => {
  setResponseHeaders(event, {
    'cache-control': 'no-store',
    'pragma': 'no-cache'
  })

  const query = getQuery(event) as Record<string, unknown>
  const encoding = parseEncoding(query)
  const body = await readBody(event).catch(() => null)
  const parsed = parsePasswordCheckBody(body)
  if (!parsed.ok) return openApiFail(event, 400, parsed.code, parsed.message)

  const result = checkPasswordStrength(parsed.password)
  if (encoding === 'text') {
    setResponseHeader(event, 'content-type', 'text/plain; charset=utf-8')
    setResponseHeader(event, 'x-request-id', ensureRequestId(event))
    return formatPasswordCheckText(result)
  }

  if (encoding === 'markdown' || encoding === 'md') {
    setResponseHeader(event, 'content-type', 'text/markdown; charset=utf-8')
    setResponseHeader(event, 'x-request-id', ensureRequestId(event))
    return formatPasswordCheckMarkdown(result)
  }

  return openApiOk(event, result, '密码强度检测成功')
})
