/**
 * GET /v1/doubao/videos · 从豆包 / 云雀（剪映）分享链接提取视频。
 *
 * Query：
 *   url  视频分享链接（必填）。含 doubao.com → 豆包；其余按云雀处理
 *   raw  传 1/true/yes 时返回上游原始数据（调试用），默认 false
 *
 * 状态码：
 *   - 400 MISSING_PARAMETER / INVALID_PARAMETER —— 缺 url / url 非法 / 链接缺 video_id（纯协议失败）
 *   - 502 UPSTREAM_ERROR / PARSE_FAILED —— 上游网络错误 / 数据结构异常（业务失败，写调用日志、跳过扣费）
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
  detectVideoSource,
  parseMediaQuery,
  type DoubaoVideo
} from '~~/server/lib/doubao/types'
import { doubaoVideoParse, yunqueVideoParse } from '~~/server/lib/doubao/video'
import { getEnabledDoubaoVideoSources } from '~~/server/lib/doubao/capability-config'

export default defineOpenApiEventHandler(async (event: H3Event) => {
  try {
    const { url, raw } = parseMediaQuery(getQuery(event) as Record<string, unknown>)
    const source = detectVideoSource(url)
    if (!(await getEnabledDoubaoVideoSources()).has(source)) {
      throw createDoubaoError('business', 403, 'DOUBAO_SOURCE_DISABLED', `视频来源 ${source} 已被管理员关闭`)
    }
    const result = source === 'doubao'
      ? await doubaoVideoParse(url, raw)
      : await yunqueVideoParse(url, raw)

    if (raw) return openApiOk(event, { source, raw: result }, '解析成功（原始数据）')

    const videos = result as DoubaoVideo[]
    return openApiOk(event, { source, count: videos.length, videos }, '视频解析成功')
  } catch (err) {
    const fail = classifyDoubaoError(err, '视频解析失败，请检查链接是否正确')
    return fail.biz
      ? openApiBizFail(event, fail.status, fail.code, fail.message)
      : openApiFail(event, fail.status, fail.code, fail.message)
  }
})
