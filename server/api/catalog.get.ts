import { getQuery } from 'h3'
import { apiCatalogService } from '~~/server/services/api-catalog-service'
import { readQueryNumber, readQueryPositiveInteger, readQueryString } from '~~/server/utils/request-query'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  return apiCatalogService.listPublicApis({
    keyword: readQueryString(query.keyword).trim(),
    status: readQueryNumber(query.status),
    categoryId: readQueryPositiveInteger(query.categoryId),
    page: readQueryPositiveInteger(query.page),
    pageSize: readQueryPositiveInteger(query.pageSize)
  })
})
