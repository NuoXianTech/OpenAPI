/**
 * GET /v1/short-video · 解析受支持平台的短视频、图集或实况分享链接。
 *
 * Query:
 *   url  分享链接，或包含分享链接的完整分享文案（必填）
 */

import type { OpenApiHandlerContext } from '~~/server/utils/open-api-handler-context'
import {
  detectShortVideoPlatform,
  parseShortVideo,
  parseShortVideoUrl
} from '~~/server/lib/short-video'
import { classifyShortVideoError } from '~~/server/lib/short-video/types'
import { readQueryString } from '~~/server/utils/request-query'

export default defineOpenApiEventHandler(async (_event, api: OpenApiHandlerContext) => {
  api.setHeaders({ 'cache-control': 'no-store' })

  try {
    const query = api.query
    const sourceUrl = parseShortVideoUrl(readQueryString(query.url))
    const platform = detectShortVideoPlatform(sourceUrl)
    const data = await parseShortVideo(sourceUrl, platform, api.signal)
    return api.ok(data, '短视频解析成功')
  } catch (error) {
    const failure = classifyShortVideoError(error)
    if (failure.retryAfter) api.setHeaders({ 'retry-after': String(failure.retryAfter) })
    return failure.biz
      ? api.businessFail(failure.status, failure.code, failure.message)
      : api.fail(failure.status, failure.code, failure.message)
  }
}, {
  ignoreStatisticsStatusCodes: [422]
})
