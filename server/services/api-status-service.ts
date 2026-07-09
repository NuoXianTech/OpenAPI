import { inArray, lte, sql } from 'drizzle-orm'
import { apiCalls } from '~~/server/db/schema'
import {
  API_AUTO_STATUS_CACHE_TTL_MS,
  API_AUTO_STATUS_SAMPLE_SIZE,
  API_STATUS
} from '#shared/config/api-status'

interface ApiAutoStatusCacheEntry {
  value: number
  expiresAt: number
}

const apiAutoStatusCache = new Map<number, ApiAutoStatusCacheEntry>()

export function resolveApiAutoStatusFromStatusCodes(statusCodes: number[]): number {
  if (statusCodes.length === 0) return API_STATUS.unknown
  return statusCodes.every(statusCode => statusCode === 200)
    ? API_STATUS.normal
    : API_STATUS.abnormal
}

function normalizeApiIds(apiIds: number[]): number[] {
  return Array.from(new Set(
    apiIds
      .map(apiId => Math.trunc(apiId))
      .filter(apiId => Number.isInteger(apiId) && apiId > 0)
  ))
}

export async function resolveApiAutoStatuses(apiIds: number[]): Promise<Record<number, number>> {
  const normalizedIds = normalizeApiIds(apiIds)
  const result: Record<number, number> = {}
  const missingIds: number[] = []
  const now = Date.now()

  for (const apiId of normalizedIds) {
    const cached = apiAutoStatusCache.get(apiId)
    if (cached && cached.expiresAt > now) {
      result[apiId] = cached.value
    } else {
      missingIds.push(apiId)
    }
  }

  if (missingIds.length === 0) return result

  const recentCalls = db.select({
    apiId: apiCalls.apiId,
    statusCode: apiCalls.statusCode,
    rowIndex: sql<number>`row_number() over (partition by ${apiCalls.apiId} order by ${apiCalls.createdAt} desc)`.as('row_index')
  })
    .from(apiCalls)
    .where(inArray(apiCalls.apiId, missingIds))
    .as('recent_calls')

  const rows = await db.select({
    apiId: recentCalls.apiId,
    statusCode: recentCalls.statusCode
  })
    .from(recentCalls)
    .where(lte(recentCalls.rowIndex, API_AUTO_STATUS_SAMPLE_SIZE))

  const statusCodesByApiId = new Map<number, number[]>()
  for (const apiId of missingIds) {
    statusCodesByApiId.set(apiId, [])
  }
  for (const row of rows) {
    statusCodesByApiId.get(row.apiId)?.push(row.statusCode)
  }

  const expiresAt = Date.now() + API_AUTO_STATUS_CACHE_TTL_MS
  for (const apiId of missingIds) {
    const value = resolveApiAutoStatusFromStatusCodes(statusCodesByApiId.get(apiId) || [])
    apiAutoStatusCache.set(apiId, { value, expiresAt })
    result[apiId] = value
  }

  return result
}
