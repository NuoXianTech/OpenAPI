import { createHash } from 'node:crypto'
import { and, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm'
import { isAutomaticApiStatus } from '#shared/config/api-status'
import type { ApiCatalogItem } from '#shared/types/api'
import { db } from '~~/server/db/client'
import { apiCallStats, apis } from '~~/server/db/schema'
import { resolveApiAutoStatuses, resolveEffectiveApiStatus } from './api-status-service'
import { getSharedCache, getSharedCacheVersion, incrementSharedCacheVersion } from '~~/server/utils/shared-cache'
import { toNumber } from '~~/server/utils/number'

const PUBLIC_API_CATALOG_TTL_SECONDS = 15
const PUBLIC_API_CATALOG_VERSION = 'public-apis'

export interface PublicApiCatalogFilters {
  keyword?: string
  status?: number
  categoryId?: number
}

function toContainsPattern(value: string): string {
  return `%${value.replace(/[\\%_]/g, '\\$&')}%`
}

function buildFilters(filters: PublicApiCatalogFilters): SQL[] {
  const conditions: SQL[] = []
  if (filters.keyword) {
    const keywordPattern = toContainsPattern(filters.keyword)
    const keywordCondition = or(
      ilike(apis.code, keywordPattern),
      ilike(apis.name, keywordPattern),
      ilike(apis.shortDesc, keywordPattern),
      ilike(apis.apiPath, keywordPattern)
    )
    if (keywordCondition) conditions.push(keywordCondition)
  }
  if (typeof filters.status === 'number') conditions.push(eq(apis.status, filters.status))
  if (typeof filters.categoryId === 'number' && filters.categoryId > 0) {
    conditions.push(eq(apis.categoryId, filters.categoryId))
  }
  conditions.push(eq(apis.isEnabled, true), eq(apis.isOrphaned, false))
  return conditions
}

async function loadApiStats(): Promise<Record<number, { totalCalls: number }>> {
  const rows = await db.select({
    apiId: apiCallStats.apiId,
    totalCalls: sql<number>`coalesce(sum(${apiCallStats.totalCount}), 0)`
  }).from(apiCallStats).groupBy(apiCallStats.apiId)

  return rows.reduce<Record<number, { totalCalls: number }>>((result, row) => {
    result[row.apiId] = { totalCalls: toNumber(row.totalCalls) }
    return result
  }, {})
}

function createCacheKey(filters: PublicApiCatalogFilters, version: number): string {
  const digest = createHash('sha256').update(JSON.stringify(filters)).digest('hex')
  return `cache:public:apis:v${version}:${digest}`
}

export function invalidatePublicApiCatalogCache(): Promise<number> {
  return incrementSharedCacheVersion(PUBLIC_API_CATALOG_VERSION)
}

export const apiCatalogService = {
  async listPublicApis(filters: PublicApiCatalogFilters = {}) {
    const normalizedFilters: PublicApiCatalogFilters = {
      keyword: filters.keyword?.trim() || undefined,
      status: filters.status,
      categoryId: filters.categoryId
    }
    const version = await getSharedCacheVersion(PUBLIC_API_CATALOG_VERSION)

    return getSharedCache<ApiCatalogItem[]>({
      key: createCacheKey(normalizedFilters, version),
      ttlSeconds: PUBLIC_API_CATALOG_TTL_SECONDS,
      async loader() {
        const requestedStatus = normalizedFilters.status
        const conditions = buildFilters({ ...normalizedFilters, status: undefined })
        const where = conditions.length ? and(...conditions) : undefined
        const [rows, statsMap] = await Promise.all([
          (where ? db.select().from(apis).where(where) : db.select().from(apis))
            .orderBy(desc(apis.updatedAt)),
          loadApiStats()
        ])
        const autoStatusMap = await resolveApiAutoStatuses(
          rows
            .filter(row => isAutomaticApiStatus(row.status) && row.isStatistics)
            .map(row => row.id)
        )

        return rows
          .map((row): ApiCatalogItem => ({
            id: row.id,
            name: row.name,
            status: resolveEffectiveApiStatus(row.status, row.isStatistics, autoStatusMap[row.id]),
            categoryId: row.categoryId,
            shortDesc: row.shortDesc,
            description: row.description,
            httpMethod: row.httpMethod,
            apiPath: row.apiPath,
            docUrl: row.docUrl,
            isApiKey: row.isApiKey,
            methodCosts: row.methodCosts ?? {},
            totalCalls: statsMap[row.id]?.totalCalls ?? 0
          }))
          .filter(row => typeof requestedStatus !== 'number' || row.status === requestedStatus)
      }
    })
  }
}
