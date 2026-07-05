import type { H3Event } from 'h3'
import { getQuery } from 'h3'
import {
  normalizePagination,
  type NormalizedPagination,
  type PaginationOptions
} from '~~/server/utils/pagination'

export type RequestQueryValue = string | string[] | undefined
export type RequestQuery = Record<string, RequestQueryValue>

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
