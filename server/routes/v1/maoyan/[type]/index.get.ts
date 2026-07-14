import type { H3Event } from 'h3'
import { getQuery, setResponseHeader } from 'h3'
import { getMaoyanRealtime, isMaoyanRealtimeType, isValidMaoyanDate } from '~~/server/lib/maoyan'
import { formatMaoyanRealtimeMarkdown, formatMaoyanRealtimeText } from '~~/server/lib/maoyan/format'
import { readMaoyanEncoding, setMaoyanTextHeaders } from '~~/server/lib/maoyan/request'
import { openApiBizFail } from '~~/server/utils/api-call-outcome'
import { openApiFail, openApiOk } from '~~/server/utils/open-api-response'
import { readQueryString } from '~~/server/utils/request-query'
import { isMaoyanRankingEnabled } from '~~/server/lib/maoyan/capability-config'

async function handleMaoyanRealtime(event: H3Event) {
  const type = getRouterParam(event, 'type') || ''
  if (!isMaoyanRealtimeType(type)) return openApiFail(event, 404, 'NOT_FOUND', '仅支持 movie、tv 或 web 类型')
  if (!await isMaoyanRankingEnabled(type)) {
    return openApiFail(event, 403, 'MAOYAN_RANKING_DISABLED', `猫眼 ${type} 榜单已被管理员关闭`)
  }
  const query = getQuery(event) as Record<string, unknown>
  const date = readQueryString(query.date).trim()
  if (date && !isValidMaoyanDate(date)) return openApiFail(event, 400, 'INVALID_DATE', 'date 必须是 YYYY-MM-DD 格式的有效日期')
  try {
    const data = await getMaoyanRealtime(type, date || undefined)
    const encoding = readMaoyanEncoding(event)
    if (encoding === 'text') { setMaoyanTextHeaders(event, 'text/plain', 60); return formatMaoyanRealtimeText(type, data) }
    if (encoding === 'markdown' || encoding === 'md') { setMaoyanTextHeaders(event, 'text/markdown', 60); return formatMaoyanRealtimeMarkdown(type, data) }
    setResponseHeader(event, 'cache-control', 'public, max-age=60')
    const resource = data?.[type]
    if (!resource) throw new Error('猫眼上游返回了不匹配的数据类型')
    return openApiOk(event, resource, `获取猫眼 ${type} 榜单成功`)
  } catch (error) {
    const message = error instanceof Error ? error.message : '获取猫眼实时榜单失败'
    return openApiBizFail(event, 502, 'UPSTREAM_ERROR', message)
  }
}

export default defineEventHandler(handleMaoyanRealtime)
