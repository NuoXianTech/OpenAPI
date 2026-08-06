/**
 * GET /v1/bing · 获取必应每日壁纸。
 *
 * Query:
 *   encode|encoding  image|json|text|markdown|md，默认 json；两者均可选择输出格式
 *   type             auto|pc|mobile，默认 auto；auto 按 User-Agent 选择桌面 / 移动端壁纸
 *
 * 内容协商:
 *   - image → 302 跳转到图片 URL
 *   - json → 标准 openApiResponse 壳，data 为壁纸元数据
 *   - text → 直出图片 URL
 *   - markdown|md → 直出 Markdown
 */

import type { H3Event } from 'h3'
import type { OpenApiHandlerContext } from '~~/server/utils/api-guard'
import { getQuery, getRequestHeader, sendRedirect, setResponseHeader } from 'h3'
import { openApiBizFail } from '~~/server/utils/api-call-outcome'
import { openApiOk } from '~~/server/utils/open-api-response'
import { ensureRequestId } from '~~/server/utils/request-id'
import { readQueryString } from '~~/server/utils/request-query'
import {
  DEFAULT_BING_ENCODE,
  DEFAULT_BING_IMAGE_TYPE,
  isBingEncode,
  isBingImageType,
  type BingEncode,
  type BingImageType
} from '~~/server/lib/bing/types'
import { createBingImageUrl, createBingMarkdown, getBingImage, resolveBingCoverUrl } from '~~/server/lib/bing/image'

function parseBingEncode(query: Record<string, unknown>): BingEncode {
  const rawEncode = readQueryString(query.encode || query.encoding).trim().toLowerCase()
  return isBingEncode(rawEncode) ? rawEncode : DEFAULT_BING_ENCODE
}

function parseBingImageType(query: Record<string, unknown>): BingImageType {
  const rawType = readQueryString(query.type).trim().toLowerCase()
  return isBingImageType(rawType) ? rawType : DEFAULT_BING_IMAGE_TYPE
}

export default defineOpenApiEventHandler(async (event: H3Event, { signal }: OpenApiHandlerContext) => {
  const query = getQuery(event) as Record<string, unknown>
  const encode = parseBingEncode(query)
  const type = parseBingImageType(query)
  const userAgent = getRequestHeader(event, 'user-agent') || ''

  try {
    const data = await getBingImage(signal)
    const cover = resolveBingCoverUrl(data.cover, type, userAgent)
    const record = {
      ...data,
      cover,
      cover_4k: createBingImageUrl(data.cover, 'UHD')
    }

    setResponseHeader(event, 'access-control-allow-origin', '*')
    setResponseHeader(event, 'cache-control', 'public, max-age=3600')

    if (encode === 'image') {
      setResponseHeader(event, 'x-request-id', ensureRequestId(event))
      return sendRedirect(event, record.cover, 302)
    }

    if (encode === 'text') {
      setResponseHeader(event, 'content-type', 'text/plain; charset=utf-8')
      setResponseHeader(event, 'x-request-id', ensureRequestId(event))
      return record.cover
    }

    if (encode === 'markdown' || encode === 'md') {
      setResponseHeader(event, 'content-type', 'text/markdown; charset=utf-8')
      setResponseHeader(event, 'x-request-id', ensureRequestId(event))
      return createBingMarkdown(record)
    }

    return openApiOk(event, record, '获取必应每日壁纸成功')
  } catch (error) {
    const message = error instanceof Error ? error.message : '获取必应每日壁纸失败'
    return openApiBizFail(event, 502, 'UPSTREAM_ERROR', `获取必应每日壁纸失败：${message}`)
  }
})
