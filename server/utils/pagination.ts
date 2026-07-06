import { clampInteger } from '~~/server/utils/number'
import { firstQueryValue, type RequestQuery } from '~~/server/utils/request-query'

interface PaginationInput {
  limit?: unknown
  offset?: unknown
}

export interface PaginationOptions {
  defaultLimit?: number
  maxLimit?: number
  defaultOffset?: number
}

export interface NormalizedPagination {
  limit: number
  offset: number
}

interface ReadPaginationQueryResult extends NormalizedPagination {
  query: RequestQuery
}

interface RequestQueryEvent {
  path?: string
  node?: {
    req?: {
      url?: string
    }
  }
}

const DEFAULT_LIMIT = 50
const DEFAULT_MAX_LIMIT = 200
const DEFAULT_OFFSET = 0

function toFiniteInteger(value: unknown): number | null {
  const normalized = firstQueryValue(value)
  if (normalized === null || normalized === undefined || normalized === '') return null

  const numericValue = typeof normalized === 'number' ? normalized : Number(normalized)
  if (!Number.isFinite(numericValue)) return null

  return Math.trunc(numericValue)
}

export function normalizePagination(
  input: PaginationInput,
  options: PaginationOptions = {}
): NormalizedPagination {
  const maxLimit = Math.max(Math.trunc(options.maxLimit ?? DEFAULT_MAX_LIMIT), 1)
  const defaultLimit = clampInteger(Math.trunc(options.defaultLimit ?? DEFAULT_LIMIT), 1, maxLimit)
  const defaultOffset = Math.max(Math.trunc(options.defaultOffset ?? DEFAULT_OFFSET), 0)
  const parsedLimit = toFiniteInteger(input.limit)
  const parsedOffset = toFiniteInteger(input.offset)

  return {
    limit: clampInteger(parsedLimit ?? defaultLimit, 1, maxLimit),
    offset: Math.max(parsedOffset ?? defaultOffset, 0)
  }
}

function readQueryFromPath(path: string | undefined): RequestQuery {
  if (!path) return {}

  const search = path.startsWith('?') ? path.slice(1) : path.split('?')[1]
  if (!search) return {}

  const query: RequestQuery = {}
  for (const [key, value] of new URLSearchParams(search)) {
    const current = query[key]
    if (current === undefined) {
      query[key] = value
      continue
    }

    query[key] = Array.isArray(current) ? [...current, value] : [current, value]
  }

  return query
}

export function readPaginationQuery(
  event: RequestQueryEvent,
  options: PaginationOptions = {}
): ReadPaginationQueryResult {
  const query = readQueryFromPath(event.path ?? event.node?.req?.url)
  return {
    query,
    ...normalizePagination(query, options)
  }
}
