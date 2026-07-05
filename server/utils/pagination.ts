import { clampInteger } from '~~/server/utils/number'

export interface PaginationInput {
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

const DEFAULT_LIMIT = 50
const DEFAULT_MAX_LIMIT = 200
const DEFAULT_OFFSET = 0

function firstQueryValue(value: unknown): unknown {
  return Array.isArray(value) ? firstQueryValue(value[0]) : value
}

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
