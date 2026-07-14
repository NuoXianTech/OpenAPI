/**
 * GET /v1/doubao · 列出本接口的能力与子端点。
 *
 * 供前端 / 调用方发现可用端点与支持的来源，无需鉴权、无副作用。
 */

import type { H3Event } from 'h3'
import { openApiOk } from '~~/server/utils/open-api-response'
import { IMAGE_SOURCE_LABELS, VIDEO_SOURCE_LABELS } from '~~/server/lib/doubao/types'
import {
  getEnabledDoubaoImageSources,
  getEnabledDoubaoVideoSources
} from '~~/server/lib/doubao/capability-config'

export default defineEventHandler(async (event: H3Event) => {
  const [enabledImageSources, enabledVideoSources] = await Promise.all([
    getEnabledDoubaoImageSources(),
    getEnabledDoubaoVideoSources()
  ])
  return openApiOk(event, {
    name: '豆包资源解析',
    description: '从豆包 / 千问对话链接提取图片，从豆包 / 云雀分享链接提取视频。',
    endpoints: [
      {
        method: 'GET',
        path: '/v1/doubao/images',
        summary: '解析对话图片',
        sources: Object.keys(IMAGE_SOURCE_LABELS).filter(source => enabledImageSources.has(source)),
        query: { url: '对话分享链接（必填）', raw: '是否返回上游原始数据，默认 false' }
      },
      {
        method: 'GET',
        path: '/v1/doubao/videos',
        summary: '解析分享视频',
        sources: Object.keys(VIDEO_SOURCE_LABELS).filter(source => enabledVideoSources.has(source)),
        query: { url: '视频分享链接（必填）', raw: '是否返回上游原始数据，默认 false' }
      }
    ]
  }, '获取豆包解析能力成功')
})
