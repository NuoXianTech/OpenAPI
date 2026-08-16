import { and, eq, gte, inArray, lte, sql } from 'drizzle-orm'
import { apiCalls } from '~~/server/db/schema'
import {
  API_AUTO_STATUS_CACHE_TTL_MS,
  API_AUTO_STATUS_MIN_AVAILABILITY_RATE,
  API_AUTO_STATUS_SAMPLE_SIZE,
  API_AUTO_STATUS_WINDOW_MS,
  API_STATUS,
  isAutomaticApiStatus
} from '#shared/config/api-status'

interface ApiAutoStatusCacheEntry {
  value: number
  expiresAt: number
}

const routeStatusCache = new Map<string, ApiAutoStatusCacheEntry>()

interface ApiAutoStatusSample {
  statusCode: number
}

function isAvailableSample(sample: ApiAutoStatusSample): boolean {
  return sample.statusCode >= 200 && sample.statusCode < 500
}

export function resolveApiAutoStatus(samples: ApiAutoStatusSample[]): number {
  if (samples.length === 0) return API_STATUS.unknown

  const availableCount = samples.filter(isAvailableSample).length
  return availableCount / samples.length >= API_AUTO_STATUS_MIN_AVAILABILITY_RATE
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

function normalizeRouteIds(routeIds: string[]): string[] {
  return Array.from(new Set(routeIds.map(id => id.trim()).filter(Boolean)))
}

export async function resolveApiAutoStatuses(routeIds: string[]): Promise<Record<string, number>> {
  const normalizedIds = normalizeRouteIds(routeIds)
  const result: Record<string, number> = {}
  const missingIds: string[] = []
  const now = Date.now()

  for (const routeId of normalizedIds) {
    const cached = routeStatusCache.get(routeId)
    if (cached && cached.expiresAt > now) result[routeId] = cached.value
    else missingIds.push(routeId)
  }
  if (missingIds.length === 0) return result

  const windowStart = new Date(now - API_AUTO_STATUS_WINDOW_MS)
  const recentCalls = db.select({
    routeId: apiCalls.routeId,
    statusCode: apiCalls.statusCode,
    rowIndex: sql<number>`row_number() over (
      partition by ${apiCalls.routeId}
      order by ${apiCalls.createdAt} desc, ${apiCalls.id} desc
    )`.as('row_index')
  })
    .from(apiCalls)
    .where(and(
      inArray(apiCalls.routeId, missingIds),
      eq(apiCalls.isCounted, true),
      gte(apiCalls.createdAt, windowStart)
    ))
    .as('recent_calls')

  const rows = await db.select({
    routeId: recentCalls.routeId,
    statusCode: recentCalls.statusCode
  })
    .from(recentCalls)
    .where(lte(recentCalls.rowIndex, API_AUTO_STATUS_SAMPLE_SIZE))

  const samplesByRouteId = new Map<string, ApiAutoStatusSample[]>(
    missingIds.map(routeId => [routeId, []])
  )
  for (const row of rows) {
    samplesByRouteId.get(row.routeId)?.push({ statusCode: row.statusCode })
  }

  const expiresAt = Date.now() + API_AUTO_STATUS_CACHE_TTL_MS
  for (const routeId of missingIds) {
    const value = resolveApiAutoStatus(samplesByRouteId.get(routeId) ?? [])
    routeStatusCache.set(routeId, { value, expiresAt })
    result[routeId] = value
  }
  return result
}
