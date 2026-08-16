import type { OpenApiHandlerContext } from '~~/server/utils/open-api-handler-context'
import { getMaoyanRealtime, isMaoyanRealtimeType, isValidMaoyanDate } from '~~/server/lib/maoyan'
import { formatMaoyanRealtimeMarkdown, formatMaoyanRealtimeText } from '~~/server/lib/maoyan/format'
import { readQueryString } from '~~/server/utils/request-query'
import { isMaoyanRankingEnabled } from '~~/server/lib/maoyan/capability-config'

async function handleMaoyanRealtime(_event: unknown, api: OpenApiHandlerContext) {
  const type = api.params.type || ''
  if (!isMaoyanRealtimeType(type)) return api.fail(404, 'NOT_FOUND', '仅支持 movie、tv 或 web 类型')
  if (!await isMaoyanRankingEnabled(type)) {
    return api.fail(403, 'MAOYAN_RANKING_DISABLED', `猫眼 ${type} 榜单已被管理员关闭`)
  }
  const date = readQueryString(api.query.date).trim()
  if (date && !isValidMaoyanDate(date)) return api.fail(400, 'INVALID_DATE', 'date 必须是 YYYY-MM-DD 格式的有效日期')
  try {
    const data = await getMaoyanRealtime(type, date || undefined, api.signal)
    const resource = data?.[type]
    if (!resource) throw new Error('猫眼上游返回了不匹配的数据类型')
    return api.respond(resource, {
      message: `获取猫眼 ${type} 榜单成功`,
      text: () => formatMaoyanRealtimeText(type, data),
      markdown: () => formatMaoyanRealtimeMarkdown(type, data),
      headers: { 'cache-control': 'public, max-age=60' }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '获取猫眼实时榜单失败'
    return api.businessFail(502, 'UPSTREAM_ERROR', message)
  }
}

export default defineOpenApiEventHandler(handleMaoyanRealtime)
