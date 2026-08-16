/**
 * GET /v1/bing · 获取必应每日壁纸。
 *
 * Query:
 *   encode|encoding  image|image-4k|json|text|markdown|md，默认 json；两者均可选择输出格式
 *   type             auto|pc|mobile，默认 auto；auto 按 User-Agent 选择桌面 / 移动端壁纸
 *
 * JSON data includes both the selected cover URL and the original 4K UHD URL.
 *
 * 内容协商:
 *   - image → 302 跳转到按 type 选择的图片 URL
 *   - image-4k → 302 跳转到 UHD 图片 URL
 *   - json → 标准 openApiResponse 壳，data 为壁纸元数据
 *   - text → 直出图片 URL
 *   - markdown|md → 直出 Markdown
 */

import type { OpenApiHandlerContext } from '~~/server/utils/open-api-handler-context'
import { readQueryString } from '~~/server/utils/request-query'
import {
  DEFAULT_BING_ENCODE,
  DEFAULT_BING_IMAGE_TYPE,
  isBingEncode,
  isBingImageType,
  type BingEncode,
  type BingImageType
} from '~~/server/lib/bing/types'
import { createBingMarkdown, getBingImage, resolveBingCoverUrl } from '~~/server/lib/bing/image'

function parseBingEncode(query: Record<string, unknown>): BingEncode {
  const rawEncode = readQueryString(query.encode || query.encoding).trim().toLowerCase()
  return isBingEncode(rawEncode) ? rawEncode : DEFAULT_BING_ENCODE
}

function parseBingImageType(query: Record<string, unknown>): BingImageType {
  const rawType = readQueryString(query.type).trim().toLowerCase()
  return isBingImageType(rawType) ? rawType : DEFAULT_BING_IMAGE_TYPE
}

export default defineOpenApiEventHandler(async (_event, api: OpenApiHandlerContext) => {
  const query = api.query
  const encode = parseBingEncode(query)
  const type = parseBingImageType(query)
  const userAgent = api.header('user-agent') || ''

  try {
    const data = await getBingImage(api.signal)
    const cover = resolveBingCoverUrl(data.cover, type, userAgent)
    const record = {
      ...data,
      cover,
      cover_4k: data.cover_4k
    }

    api.setHeaders({
      'access-control-allow-origin': '*',
      'cache-control': 'public, max-age=3600'
    })

    if (encode === 'image' || encode === 'image-4k') {
      return api.redirect(encode === 'image-4k' ? data.cover_4k : record.cover)
    }

    return api.respond(record, {
      message: '获取必应每日壁纸成功',
      text: () => record.cover,
      markdown: createBingMarkdown
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '获取必应每日壁纸失败'
    return api.businessFail(502, 'UPSTREAM_ERROR', `获取必应每日壁纸失败：${message}`)
  }
})
