/**
 * GET /v1/short-video · 解析受支持平台的短视频、图集或实况分享链接。
 *
 * Query:
 *   url  分享链接，或包含分享链接的完整分享文案（必填）
 */

import type { H3Event } from 'h3'
import type { OpenApiHandlerContext } from '~~/server/utils/api-guard'
import { getQuery, setResponseHeader } from 'h3'
import {
  detectShortVideoPlatform,
  parseShortVideo,
  parseShortVideoUrl
} from '~~/server/lib/short-video'
import { classifyShortVideoError } from '~~/server/lib/short-video/types'
import { openApiBizFail } from '~~/server/utils/api-call-outcome'
import { openApiFail, openApiOk } from '~~/server/utils/open-api-response'
import { readQueryString } from '~~/server/utils/request-query'

export default defineOpenApiEventHandler(async (event: H3Event, { signal }: OpenApiHandlerContext) => {
  setResponseHeader(event, 'cache-control', 'no-store')

  try {
    const query = getQuery(event) as Record<string, unknown>
    const sourceUrl = parseShortVideoUrl(readQueryString(query.url))
    const platform = detectShortVideoPlatform(sourceUrl)
    const data = await parseShortVideo(sourceUrl, platform, signal)
    return openApiOk(event, data, '短视频解析成功')
  } catch (error) {
    const failure = classifyShortVideoError(error)
    if (failure.retryAfter) setResponseHeader(event, 'retry-after', failure.retryAfter)
    return failure.biz
      ? openApiBizFail(event, failure.status, failure.code, failure.message)
      : openApiFail(event, failure.status, failure.code, failure.message)
  }
})
