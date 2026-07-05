import type { H3Event } from 'h3'
import { getQuery } from 'h3'
import { apiService } from '~~/server/services/api-service'
import { readQueryNumber, readQueryString } from '~~/server/utils/request-query'

export default defineEventHandler(async (event: H3Event) => {
  const query = getQuery(event)
  return apiService.listPublicApis({
    keyword: readQueryString(query.keyword).trim(),
    status: readQueryNumber(query.status),
    categoryId: readQueryNumber(query.categoryId)
  })
})
