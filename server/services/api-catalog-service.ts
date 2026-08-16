import { createHash } from 'node:crypto'
import { inArray, sql } from 'drizzle-orm'
import { API_STATUS } from '#shared/config/api-status'
import type { ApiCatalogItem, ApiCatalogPage } from '#shared/types/api'
import { db } from '~~/server/db/client'
import { apiCallStats } from '~~/server/db/schema'
import { activeRoutingCatalogService, type ActiveCatalogRoute } from '~~/server/services/active-routing-catalog-service'
import {
  resolveApiAutoStatuses,
  resolveEffectiveApiStatus
} from '~~/server/services/api-status-service'
import {
  getSharedCache,
  getSharedCacheVersion,
  incrementSharedCacheVersion
} from '~~/server/utils/shared-cache'
import { toNumber } from '~~/server/utils/number'

const PUBLIC_API_CATALOG_TTL_SECONDS = 15
const PUBLIC_API_CATALOG_CACHE_NAMESPACE = 'public-api-catalog'
const DEFAULT_PAGE_SIZE = 24
const MAX_PAGE_SIZE = 100

export interface PublicApiCatalogFilters {
  keyword?: string
  status?: number
  categoryId?: number
  page?: number
  pageSize?: number
}

interface StatusRoute extends ActiveCatalogRoute {
  status: number
}

function normalizePositiveInteger(value: number | undefined, fallback: number, maximum: number): number {
  if (!Number.isFinite(value)) return fallback
  return Math.min(Math.max(Math.trunc(value!), 1), maximum)
}

function normalizeFilters(filters: PublicApiCatalogFilters): Required<Pick<PublicApiCatalogFilters, 'page' | 'pageSize'>> & PublicApiCatalogFilters {
  return {
    keyword: filters.keyword?.trim() || undefined,
    status: filters.status,
    categoryId: filters.categoryId && filters.categoryId > 0
      ? Math.trunc(filters.categoryId)
      : undefined,
    page: normalizePositiveInteger(filters.page, 1, Number.MAX_SAFE_INTEGER),
    pageSize: normalizePositiveInteger(filters.pageSize, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)
  }
}

function configuredStatus(item: ActiveCatalogRoute): number {
  if (
    item.route.productLifecycle === 'deprecated'
    || item.route.versionState === 'deprecated'
  ) return API_STATUS.deprecated
  if (item.route.catalogStatus === 'maintenance') return API_STATUS.maintenance
  return API_STATUS.automatic
}

function matchesText(item: ActiveCatalogRoute, keyword: string | undefined): boolean {
  if (!keyword) return true
  const value = keyword.toLocaleLowerCase()
  return [
    item.route.productSlug,
    item.product.name,
    item.product.summary,
    item.route.name,
    item.route.pathPattern
  ].some(candidate => candidate.toLocaleLowerCase().includes(value))
}

function baseRoutes(
  routes: ActiveCatalogRoute[],
  filters: ReturnType<typeof normalizeFilters>
): ActiveCatalogRoute[] {
  return routes.filter(item => (
    matchesText(item, filters.keyword)
    && (
      filters.categoryId === undefined
      || item.product.categoryId === filters.categoryId
    )
  )).sort((left, right) => (
    (right.publishedAt?.getTime() ?? 0) - (left.publishedAt?.getTime() ?? 0)
    || left.product.name.localeCompare(right.product.name)
    || left.route.pathPattern.localeCompare(right.route.pathPattern)
    || left.route.method.localeCompare(right.route.method)
  ))
}

async function addStatuses(routes: ActiveCatalogRoute[]): Promise<StatusRoute[]> {
  const automaticRouteIds = routes
    .filter(item => (
      configuredStatus(item) === API_STATUS.automatic
      && item.route.isStatistics
    ))
    .map(item => item.route.id)
  const automaticStatuses = await resolveApiAutoStatuses(automaticRouteIds)
  return routes.map(item => ({
    ...item,
    status: resolveEffectiveApiStatus(
      configuredStatus(item),
      item.route.isStatistics,
      automaticStatuses[item.route.id]
    )
  }))
}

async function loadRouteStats(routeIds: string[]): Promise<Record<string, number>> {
  if (routeIds.length === 0) return {}
  const rows = await db.select({
    routeId: apiCallStats.routeId,
    totalCalls: sql<number>`coalesce(sum(${apiCallStats.totalCount}), 0)`
  }).from(apiCallStats)
    .where(inArray(apiCallStats.routeId, routeIds))
    .groupBy(apiCallStats.routeId)
  return Object.fromEntries(rows.map(row => [row.routeId, toNumber(row.totalCalls)]))
}

function createCacheKey(filters: ReturnType<typeof normalizeFilters>): string {
  const digest = createHash('sha256').update(JSON.stringify(filters)).digest('hex')
  return `cache:public:apis:${digest}`
}

function catalogItem(item: StatusRoute, totalCalls: number): ApiCatalogItem {
  return {
    id: item.route.id,
    name: item.route.name || item.product.name,
    status: item.status,
    categoryId: item.product.categoryId,
    shortDesc: item.product.summary || item.route.name,
    description: item.product.description || item.product.summary,
    httpMethod: item.route.method,
    apiPath: item.route.pathPattern,
    docUrl: '',
    isApiKey: item.route.isApiKey,
    methodCosts: { [item.route.method]: item.route.creditsCost },
    totalCalls
  }
}

export const apiCatalogService = {
  async listPublicApis(filters: PublicApiCatalogFilters = {}): Promise<ApiCatalogPage> {
    const normalized = normalizeFilters(filters)
    const cacheVersion = await getSharedCacheVersion(PUBLIC_API_CATALOG_CACHE_NAMESPACE)
    return getSharedCache<ApiCatalogPage>({
      key: `${createCacheKey(normalized)}:v${cacheVersion}`,
      ttlSeconds: PUBLIC_API_CATALOG_TTL_SECONDS,
      async loader() {
        const candidates = baseRoutes(
          await activeRoutingCatalogService.list(),
          normalized
        )
        const withStatus = normalized.status === undefined
          ? null
          : (await addStatuses(candidates)).filter(item => item.status === normalized.status)
        const total = withStatus?.length ?? candidates.length
        const start = Math.min((normalized.page - 1) * normalized.pageSize, total)
        const pageRoutes = withStatus
          ? withStatus.slice(start, start + normalized.pageSize)
          : await addStatuses(candidates.slice(start, start + normalized.pageSize))
        const stats = await loadRouteStats(pageRoutes.map(item => item.route.id))

        return {
          items: pageRoutes.map(item => catalogItem(item, stats[item.route.id] ?? 0)),
          total,
          page: normalized.page,
          pageSize: normalized.pageSize
        }
      }
    })
  }
}

export function invalidatePublicApiCatalogCache(): Promise<number> {
  return incrementSharedCacheVersion(PUBLIC_API_CATALOG_CACHE_NAMESPACE)
}
