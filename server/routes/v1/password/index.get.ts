/**
 * GET /v1/password · 使用密码学安全随机数生成密码。
 *
 * Query:
 *   length           4-128，默认 16
 *   mode             strong|alphanumeric|numeric，默认 strong
 *   encode|encoding  json|text|markdown|md，默认 json
 */

import type { H3Event } from 'h3'
import { getQuery, setResponseHeader, setResponseHeaders } from 'h3'
import {
  formatPasswordGeneratorMarkdown,
  formatPasswordGeneratorText,
  generatePassword,
  isPasswordGeneratorEncoding,
  parsePasswordGeneratorMode,
  parsePasswordLength,
  type PasswordGeneratorEncoding
} from '~~/server/lib/password-generator'
import { openApiFail, openApiOk } from '~~/server/utils/open-api-response'
import { ensureRequestId } from '~~/server/utils/request-id'
import { readQueryString } from '~~/server/utils/request-query'

function parseEncoding(query: Record<string, unknown>): PasswordGeneratorEncoding {
  const value = readQueryString(query.encode || query.encoding).trim().toLowerCase()
  return isPasswordGeneratorEncoding(value) ? value : 'json'
}

export default defineOpenApiEventHandler((event: H3Event) => {
  setResponseHeaders(event, {
    'cache-control': 'no-store',
    'pragma': 'no-cache'
  })

  const query = getQuery(event) as Record<string, unknown>
  const length = parsePasswordLength(readQueryString(query.length).trim())
  if (length === null) {
    return openApiFail(event, 400, 'INVALID_LENGTH', 'length 必须是 4-128 之间的整数')
  }

  const mode = parsePasswordGeneratorMode(readQueryString(query.mode).trim())
  if (mode === null) {
    return openApiFail(event, 400, 'INVALID_MODE', 'mode 仅支持 strong、alphanumeric 或 numeric')
  }

  const encoding = parseEncoding(query)
  const result = generatePassword({ length, mode })
  if (encoding === 'text') {
    setResponseHeader(event, 'content-type', 'text/plain; charset=utf-8')
    setResponseHeader(event, 'x-request-id', ensureRequestId(event))
    return formatPasswordGeneratorText(result)
  }

  if (encoding === 'markdown' || encoding === 'md') {
    setResponseHeader(event, 'content-type', 'text/markdown; charset=utf-8')
    setResponseHeader(event, 'x-request-id', ensureRequestId(event))
    return formatPasswordGeneratorMarkdown(result)
  }

  return openApiOk(event, result, '随机密码生成成功')
})
