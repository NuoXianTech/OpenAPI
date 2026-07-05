import type { H3Event } from 'h3'
import { getQuery } from 'h3'
import {
  normalizePagination,
  type NormalizedPagination,
  type PaginationOptions
} from '~~/server/utils/pagination'
import type { RequestQuery } from '~~/server/utils/request-query'

export interface ReadPaginationQueryResult extends NormalizedPagination {
  query: RequestQuery
}

export function readPaginationQuery(
  event: H3Event,
  options: PaginationOptions = {}
): ReadPaginationQueryResult {
  const query = getQuery(event) as RequestQuery
  return {
    query,
    ...normalizePagination(query, options)
  }
}
