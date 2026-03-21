import type { H3Event } from 'h3'
import { getQuery } from 'h3'
import { apiService } from '~~/server/service/apiService'
import { report } from '~~/server/utils/report'

export default defineEventHandler(async (event: H3Event) => {
  const query = getQuery(event)
  const data = await apiService.listPublicApis({
    keyword: (query.keyword || '').toString().trim(),
    status: query.status !== undefined && query.status !== '' ? Number(query.status) : undefined,
    category: (query.category || '').toString().trim(),
  })

  return report(event, 200, '接口列表获取成功！', data)
})