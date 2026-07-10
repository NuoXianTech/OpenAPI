import { and, eq, gte, inArray, lte, sql } from 'drizzle-orm'
import { apiCalls } from '~~/server/db/schema'
import {
  API_AUTO_STATUS_CACHE_TTL_MS,
  API_AUTO_STATUS_MIN_SUCCESS_RATE,
  API_AUTO_STATUS_SAMPLE_SIZE,
  API_AUTO_STATUS_WINDOW_MS,
  API_STATUS,
  isAutomaticApiStatus
} from '#shared/config/api-status'

interface ApiAutoStatusCacheEntry {
  value: number
  expiresAt: number
}

const apiAutoStatusCache = new Map<number, ApiAutoStatusCacheEntry>()

export interface ApiAutoStatusSample {
  statusCode: number
  errorCode: string | null
}

function isSuccessfulSample(sample: ApiAutoStatusSample): boolean {
  return sample.statusCode >= 200
    && sample.statusCode < 400
    && !sample.errorCode
}

export function resolveApiAutoStatus(samples: ApiAutoStatusSample[]): number {
  if (samples.length === 0) return API_STATUS.unknown

  const successCount = samples.filter(isSuccessfulSample).length
  return successCount / samples.length >= API_AUTO_STATUS_MIN_SUCCESS_RATE
    ? API_STATUS.normal
    : API_STATUS.abnormal
}

export function resolveEffectiveApiStatus(
  configuredStatus: number,
  isStatisticsEnabled: boolean,
  automaticStatus: number = API_STATUS.unknown
): number {
  if (!isAutomaticApiStatus(configuredStatus)) return configuredStatus
  return isStatisticsEnabled ? automaticStatus : API_STATUS.unknown
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

  const windowStart = new Date(now - API_AUTO_STATUS_WINDOW_MS)
  const recentCalls = db.select({
    apiId: apiCalls.apiId,
    statusCode: apiCalls.statusCode,
    errorCode: apiCalls.errorCode,
    rowIndex: sql<number>`row_number() over (
      partition by ${apiCalls.apiId}
      order by ${apiCalls.createdAt} desc, ${apiCalls.id} desc
    )`.as('row_index')
  })
    .from(apiCalls)
    .where(and(
      inArray(apiCalls.apiId, missingIds),
      eq(apiCalls.isCounted, true),
      gte(apiCalls.createdAt, windowStart)
    ))
    .as('recent_calls')

  const rows = await db.select({
    apiId: recentCalls.apiId,
    statusCode: recentCalls.statusCode,
    errorCode: recentCalls.errorCode
  })
    .from(recentCalls)
    .where(lte(recentCalls.rowIndex, API_AUTO_STATUS_SAMPLE_SIZE))

  const samplesByApiId = new Map<number, ApiAutoStatusSample[]>()
  for (const apiId of missingIds) {
    samplesByApiId.set(apiId, [])
  }
  for (const row of rows) {
    samplesByApiId.get(row.apiId)?.push({
      statusCode: row.statusCode,
      errorCode: row.errorCode
    })
  }

  const expiresAt = Date.now() + API_AUTO_STATUS_CACHE_TTL_MS
  for (const apiId of missingIds) {
    const value = resolveApiAutoStatus(samplesByApiId.get(apiId) || [])
    apiAutoStatusCache.set(apiId, { value, expiresAt })
    result[apiId] = value
  }

  return result
}
