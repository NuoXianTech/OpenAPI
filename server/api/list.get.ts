import type { H3Event } from 'h3'
import { getQuery } from 'h3'
import { apiService } from '~~/server/service/apiService'

export default defineEventHandler(async (event: H3Event) => {
  const query = getQuery(event)
  return apiService.listPublicApis({
    keyword: (query.keyword || '').toString().trim(),
    status: query.status !== undefined && query.status !== '' ? Number(query.status) : undefined,
    categoryId: query.categoryId !== undefined && query.categoryId !== '' ? Number(query.categoryId) : undefined,
  })
})
