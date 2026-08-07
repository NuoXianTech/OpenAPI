import { getQuery } from 'h3'
import { apiCatalogService } from '~~/server/services/api-catalog-service'
import { readQueryNumber, readQueryString } from '~~/server/utils/request-query'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  return apiCatalogService.listPublicApis({
    keyword: readQueryString(query.keyword).trim(),
    status: readQueryNumber(query.status),
    categoryId: readQueryNumber(query.categoryId)
  })
})
