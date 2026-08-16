import { createHash } from 'node:crypto'
import { and, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm'
import { API_STATUS } from '#shared/config/api-status'
import type { ApiCatalogItem } from '#shared/types/api'
import { db } from '~~/server/db/client'
import {
  apiCallStats,
  apiProducts,
  apiRoutes,
  apiVersions,
  upstreamServices
} from '~~/server/db/schema'
import {
  getSharedCache,
  getSharedCacheVersion,
  incrementSharedCacheVersion
} from '~~/server/utils/shared-cache'
import { toNumber } from '~~/server/utils/number'
import { resolveApiAutoStatuses, resolveEffectiveApiStatus } from './api-status-service'
import { publicApiRouteCondition } from './public-api-query'

const PUBLIC_API_CATALOG_TTL_SECONDS = 15
const PUBLIC_API_CATALOG_CACHE_NAMESPACE = 'public-api-catalog'

export interface PublicApiCatalogFilters {
  keyword?: string
  status?: number
  categoryId?: number
}

function toContainsPattern(value: string): string {
  return `%${value.replace(/[\\%_]/g, '\\$&')}%`
}

function buildFilters(filters: PublicApiCatalogFilters): SQL[] {
  const conditions: SQL[] = [publicApiRouteCondition]
  if (filters.keyword) {
    const pattern = toContainsPattern(filters.keyword)
    const keywordCondition = or(
      ilike(apiProducts.slug, pattern),
      ilike(apiProducts.name, pattern),
      ilike(apiProducts.summary, pattern),
      ilike(apiRoutes.name, pattern),
      ilike(apiRoutes.pathPattern, pattern)
    )
    if (keywordCondition) conditions.push(keywordCondition)
  }
  if (filters.categoryId && filters.categoryId > 0) {
    conditions.push(eq(apiProducts.categoryId, filters.categoryId))
  }
  return conditions
}

async function loadRouteStats(): Promise<Record<string, number>> {
  const rows = await db.select({
    routeId: apiCallStats.routeId,
    totalCalls: sql<number>`coalesce(sum(${apiCallStats.totalCount}), 0)`
  }).from(apiCallStats).groupBy(apiCallStats.routeId)

  return Object.fromEntries(rows.map(row => [row.routeId, toNumber(row.totalCalls)]))
}

function createCacheKey(filters: PublicApiCatalogFilters): string {
  const digest = createHash('sha256').update(JSON.stringify(filters)).digest('hex')
  return `cache:public:apis:${digest}`
}

export const apiCatalogService = {
  async listPublicApis(filters: PublicApiCatalogFilters = {}) {
    const normalizedFilters: PublicApiCatalogFilters = {
      keyword: filters.keyword?.trim() || undefined,
      status: filters.status,
      categoryId: filters.categoryId
    }

    const cacheVersion = await getSharedCacheVersion(
      PUBLIC_API_CATALOG_CACHE_NAMESPACE
    )
    return getSharedCache<ApiCatalogItem[]>({
      key: `${createCacheKey(normalizedFilters)}:v${cacheVersion}`,
      ttlSeconds: PUBLIC_API_CATALOG_TTL_SECONDS,
      async loader() {
        const conditions = buildFilters(normalizedFilters)
        const [rows, stats] = await Promise.all([
          db.select({
            routeId: apiRoutes.id,
            routeName: apiRoutes.name,
            method: apiRoutes.method,
            path: apiRoutes.pathPattern,
            isApiKey: apiRoutes.isApiKey,
            isStatistics: apiRoutes.isStatistics,
            creditsCost: apiRoutes.creditsCost,
            categoryId: apiProducts.categoryId,
            productName: apiProducts.name,
            summary: apiProducts.summary,
            description: apiProducts.description,
            productLifecycle: apiProducts.lifecycle,
            versionState: apiVersions.state,
            updatedAt: apiRoutes.updatedAt
          }).from(apiRoutes)
            .innerJoin(apiVersions, eq(apiVersions.id, apiRoutes.apiVersionId))
            .innerJoin(apiProducts, eq(apiProducts.id, apiVersions.productId))
            .innerJoin(upstreamServices, eq(upstreamServices.id, apiRoutes.upstreamServiceId))
            .where(and(...conditions))
            .orderBy(desc(apiRoutes.updatedAt), apiProducts.name, apiRoutes.pathPattern),
          loadRouteStats()
        ])
        const autoStatuses = await resolveApiAutoStatuses(
          rows.filter(row => row.isStatistics).map(row => row.routeId)
        )

        return rows.map((row): ApiCatalogItem => {
          const configuredStatus = row.productLifecycle === 'deprecated' || row.versionState === 'deprecated'
            ? API_STATUS.deprecated
            : API_STATUS.automatic
          return {
            id: row.routeId,
            name: row.routeName || row.productName,
            status: resolveEffectiveApiStatus(
              configuredStatus,
              row.isStatistics,
              autoStatuses[row.routeId]
            ),
            categoryId: row.categoryId,
            shortDesc: row.summary || row.routeName,
            description: row.description || row.summary,
            httpMethod: row.method,
            apiPath: row.path,
            docUrl: '',
            isApiKey: row.isApiKey,
            methodCosts: { [row.method]: row.creditsCost },
            totalCalls: stats[row.routeId] ?? 0
          }
        }).filter(item => (
          normalizedFilters.status === undefined || item.status === normalizedFilters.status
        ))
      }
    })
  }
}

export function invalidatePublicApiCatalogCache(): Promise<number> {
  return incrementSharedCacheVersion(PUBLIC_API_CATALOG_CACHE_NAMESPACE)
}
