/**
 * GET /v1/lanzou · 解析蓝奏云文件分享链接。
 *
 * Query:
 *   url   蓝奏云文件分享链接（必填）
 *   pwd   分享密码（可选）
 *   type  down 时 302 跳转到下载地址，否则返回 JSON
 */

import { classifyLanzouError, parseLanzouFile, parseLanzouShareUrl } from '~~/server/lib/lanzou'
import type { OpenApiHandlerContext } from '~~/server/utils/open-api-handler-context'
import { readQueryString } from '~~/server/utils/request-query'

export default defineOpenApiEventHandler(async (_event, api: OpenApiHandlerContext) => {
  api.setHeaders({ 'cache-control': 'no-store' })

  try {
    const sourceUrl = parseLanzouShareUrl(readQueryString(api.query.url))
    const password = readQueryString(api.query.pwd).trim()
    const data = await parseLanzouFile(sourceUrl, password, api.signal)
    if (readQueryString(api.query.type).trim().toLowerCase() === 'down') {
      return api.redirect(data.url)
    }
    return api.ok(data, '蓝奏云链接解析成功')
  } catch (error) {
    const failure = classifyLanzouError(error)
    return failure.biz
      ? api.businessFail(failure.status, failure.code, failure.message)
      : api.fail(failure.status, failure.code, failure.message)
  }
}, {
  ignoreStatisticsStatusCodes: [422]
})
