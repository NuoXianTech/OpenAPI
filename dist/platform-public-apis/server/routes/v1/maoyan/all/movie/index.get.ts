import type { OpenApiHandlerContext } from '~~/server/utils/open-api-handler-context'
import { getMaoyanGlobalBoxOffice } from '~~/server/lib/maoyan'
import { formatMaoyanGlobalMarkdown, formatMaoyanGlobalText } from '~~/server/lib/maoyan/format'
import { isMaoyanRankingEnabled } from '~~/server/lib/maoyan/capability-config'

async function handleMaoyanGlobalMovie(_event: unknown, api: OpenApiHandlerContext) {
  if (!await isMaoyanRankingEnabled('globalMovie')) {
    return api.fail(403, 'MAOYAN_RANKING_DISABLED', '猫眼全球电影票房榜已被管理员关闭')
  }
  try {
    const data = await getMaoyanGlobalBoxOffice(api.signal)
    return api.respond(data, {
      message: '获取猫眼全球电影票房总榜成功',
      text: formatMaoyanGlobalText,
      markdown: formatMaoyanGlobalMarkdown,
      headers: { 'cache-control': 'public, max-age=3600' }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '获取猫眼全球电影票房总榜失败'
    return api.businessFail(502, 'UPSTREAM_ERROR', message)
  }
}

export default defineOpenApiEventHandler(handleMaoyanGlobalMovie)
