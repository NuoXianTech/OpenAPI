/**
 * GET /v1/password · 使用密码学安全随机数生成密码。
 *
 * Query:
 *   length           4-128，默认 16
 *   mode             strong|alphanumeric|numeric，默认 strong
 *   encode|encoding  json|text|markdown|md，默认 json
 */

import {
  formatPasswordGeneratorMarkdown,
  formatPasswordGeneratorText,
  generatePassword,
  parsePasswordGeneratorMode,
  parsePasswordLength
} from '~~/server/lib/password-generator'
import { readQueryString } from '~~/server/utils/request-query'

export default defineOpenApiEventHandler((_event, api) => {
  api.setHeaders({
    'cache-control': 'no-store',
    'pragma': 'no-cache'
  })

  const query = api.query
  const length = parsePasswordLength(readQueryString(query.length).trim())
  if (length === null) {
    return api.fail(400, 'INVALID_LENGTH', 'length 必须是 4-128 之间的整数')
  }

  const mode = parsePasswordGeneratorMode(readQueryString(query.mode).trim())
  if (mode === null) {
    return api.fail(400, 'INVALID_MODE', 'mode 仅支持 strong、alphanumeric 或 numeric')
  }

  const result = generatePassword({ length, mode })
  return api.respond(result, {
    message: '随机密码生成成功',
    text: formatPasswordGeneratorText,
    markdown: formatPasswordGeneratorMarkdown
  })
})
