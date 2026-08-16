import { createHash } from 'node:crypto'
import { and, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm'
import { API_STATUS } from '#shared/config/api-status'
import type { ApiCatalogItem } from '#shared/types/api'
import { db } from '~~/server/db/client'
import {
  apiCallStats,
  openapiDocuments,
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
import { parseRoutePathPattern } from '~~/server/utils/route-pattern'
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

function routeShape(path: string): string | null {
  try {
    return parseRoutePathPattern(
      path.replace(/\{path\.([A-Za-z][A-Za-z0-9_]*)\}/g, '{$1}')
    ).normalizedShape
  } catch {
    return null
  }
}

function supportRouteKey(method: string, path: string): string | null {
  const shape = routeShape(path)
  return shape ? `${method}:${shape}` : null
}

function supportRouteKeys(
  summary: Record<string, unknown> | null
): Set<string> {
  const endpoints = summary?.endpoints
  if (!Array.isArray(endpoints)) return new Set()
  return new Set(endpoints.flatMap((endpoint) => {
    if (!endpoint || typeof endpoint !== 'object' || Array.isArray(endpoint)) {
      return []
    }
    const value = endpoint as Record<string, unknown>
    if (
      value.support !== true
      || typeof value.method !== 'string'
      || typeof value.path !== 'string'
    ) return []
    const key = supportRouteKey(value.method, value.path)
    return key ? [key] : []
  }))
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
            upstreamServiceId: upstreamServices.id,
            routeName: apiRoutes.name,
            method: apiRoutes.method,
            path: apiRoutes.pathPattern,
            upstreamPathTemplate: apiRoutes.upstreamPathTemplate,
            isApiKey: apiRoutes.isApiKey,
            isStatistics: apiRoutes.isStatistics,
            creditsCost: apiRoutes.creditsCost,
            categoryId: apiProducts.categoryId,
            productName: apiProducts.name,
            summary: apiProducts.summary,
            description: apiProducts.description,
            productLifecycle: apiProducts.lifecycle,
            versionState: apiVersions.state,
            openapiSummary: openapiDocuments.parsedSummary,
            updatedAt: apiRoutes.updatedAt
          }).from(apiRoutes)
            .innerJoin(apiVersions, eq(apiVersions.id, apiRoutes.apiVersionId))
            .innerJoin(apiProducts, eq(apiProducts.id, apiVersions.productId))
            .innerJoin(upstreamServices, eq(upstreamServices.id, apiRoutes.upstreamServiceId))
            .leftJoin(openapiDocuments, eq(
              openapiDocuments.id,
              upstreamServices.openapiDocumentId
            ))
            .where(and(...conditions))
            .orderBy(desc(apiRoutes.updatedAt), apiProducts.name, apiRoutes.pathPattern),
          loadRouteStats()
        ])
        const supportKeysByUpstream = new Map<string, Set<string>>()
        const visibleRows = rows.filter((row) => {
          let supportKeys = supportKeysByUpstream.get(row.upstreamServiceId)
          if (!supportKeys) {
            supportKeys = supportRouteKeys(row.openapiSummary)
            supportKeysByUpstream.set(row.upstreamServiceId, supportKeys)
          }
          const routeKey = supportRouteKey(
            row.method,
            row.upstreamPathTemplate
          )
          return !routeKey || !supportKeys.has(routeKey)
        })
        const autoStatuses = await resolveApiAutoStatuses(
          visibleRows.filter(row => row.isStatistics).map(row => row.routeId)
        )

        return visibleRows.map((row): ApiCatalogItem => {
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
