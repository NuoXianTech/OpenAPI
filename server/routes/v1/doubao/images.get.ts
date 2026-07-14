/**
 * GET /v1/doubao/images · 从豆包 / 千问对话链接提取图片。
 *
 * Query：
 *   url  对话分享链接（必填）。含 doubao.com → 豆包；其余按千问处理
 *   raw  传 1/true/yes 时返回上游原始数据（调试用），默认 false
 *
 * 状态码：
 *   - 400 MISSING_PARAMETER / INVALID_PARAMETER —— 缺 url / url 非法 / 链接格式不支持（纯协议失败）
 *   - 502 UPSTREAM_ERROR / PARSE_FAILED —— 上游网络错误 / 页面结构变化（业务失败，写调用日志、跳过扣费）
 *
 * handler 保持薄：解析入参 → 调 server/lib/doubao 业务层 → 套响应壳。
 */

import type { H3Event } from 'h3'
import { getQuery } from 'h3'
import { openApiBizFail } from '~~/server/utils/api-call-outcome'
import { openApiFail, openApiOk } from '~~/server/utils/open-api-response'
import {
  classifyDoubaoError,
  createDoubaoError,
  detectImageSource,
  parseMediaQuery,
  type DoubaoImage
} from '~~/server/lib/doubao/types'
import { doubaoImageParse, qianwenImageParse } from '~~/server/lib/doubao/image'
import { getEnabledDoubaoImageSources } from '~~/server/lib/doubao/capability-config'

export default defineEventHandler(async (event: H3Event) => {
  try {
    const { url, raw } = parseMediaQuery(getQuery(event) as Record<string, unknown>)
    const source = detectImageSource(url)
    if (!(await getEnabledDoubaoImageSources()).has(source)) {
      throw createDoubaoError('business', 403, 'DOUBAO_SOURCE_DISABLED', `图片来源 ${source} 已被管理员关闭`)
    }
    const result = source === 'doubao'
      ? await doubaoImageParse(url, raw)
      : await qianwenImageParse(url, raw)

    if (raw) return openApiOk(event, { source, raw: result }, '解析成功（原始数据）')

    const images = result as DoubaoImage[]
    return openApiOk(event, { source, count: images.length, images }, '图片解析成功')
  } catch (err) {
    const fail = classifyDoubaoError(err, '图片解析失败，请检查链接是否正确')
    return fail.biz
      ? openApiBizFail(event, fail.status, fail.code, fail.message)
      : openApiFail(event, fail.status, fail.code, fail.message)
  }
})
