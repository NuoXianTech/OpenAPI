import type { H3Event } from 'h3'
import { setResponseHeader } from 'h3'
import { getMaoyanGlobalBoxOffice } from '~~/server/lib/maoyan'
import { formatMaoyanGlobalMarkdown, formatMaoyanGlobalText } from '~~/server/lib/maoyan/format'
import { readMaoyanEncoding, setMaoyanTextHeaders } from '~~/server/lib/maoyan/request'
import { openApiBizFail } from '~~/server/utils/api-call-outcome'
import { openApiOk } from '~~/server/utils/open-api-response'

async function handleMaoyanGlobalMovie(event: H3Event) {
  try {
    const data = await getMaoyanGlobalBoxOffice()
    const encoding = readMaoyanEncoding(event)
    if (encoding === 'text') { setMaoyanTextHeaders(event, 'text/plain', 3600); return formatMaoyanGlobalText(data) }
    if (encoding === 'markdown' || encoding === 'md') { setMaoyanTextHeaders(event, 'text/markdown', 3600); return formatMaoyanGlobalMarkdown(data) }
    setResponseHeader(event, 'cache-control', 'public, max-age=3600')
    return openApiOk(event, data, '获取猫眼全球电影票房总榜成功')
  } catch (error) {
    const message = error instanceof Error ? error.message : '获取猫眼全球电影票房总榜失败'
    return openApiBizFail(event, 502, 'UPSTREAM_ERROR', message)
  }
}

export default defineEventHandler(handleMaoyanGlobalMovie)
