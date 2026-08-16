/**
 * POST /v1/password/check · 检测密码强度，不回显或记录明文密码。
 *
 * Body:
 *   { password: string }
 *
 * Query:
 *   encode|encoding  json|text|markdown|md，默认 json
 */

import {
  checkPasswordStrength,
  formatPasswordCheckMarkdown,
  formatPasswordCheckText,
  parsePasswordCheckBody
} from '~~/server/lib/password-check'

export default defineOpenApiEventHandler(async (_event, api) => {
  api.setHeaders({
    'cache-control': 'no-store',
    'pragma': 'no-cache'
  })

  const body = await api.readBody(32 * 1024)
  const parsed = parsePasswordCheckBody(body)
  if (!parsed.ok) return api.fail(400, parsed.code, parsed.message)

  const result = checkPasswordStrength(parsed.password)
  return api.respond(result, {
    message: '密码强度检测成功',
    text: formatPasswordCheckText,
    markdown: formatPasswordCheckMarkdown
  })
})
