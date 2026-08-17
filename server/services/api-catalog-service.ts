import { createHash } from 'node:crypto'
import { inArray, sql } from 'drizzle-orm'
import { API_STATUS } from '#shared/config/api-status'
import type {
  ApiCatalogEndpoint,
  ApiCatalogItem,
  ApiCatalogPage
} from '#shared/types/api'
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

interface CatalogProduct {
  id: string
  routes: ActiveCatalogRoute[]
}

interface StatusProduct {
  id: string
  routes: StatusRoute[]
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

function matchesText(item: CatalogProduct, keyword: string | undefined): boolean {
  if (!keyword) return true
  const value = keyword.toLocaleLowerCase()
  const first = item.routes[0]
  if (!first) return false
  return [first.route.productSlug, first.product.name, first.product.summary]
    .some(candidate => candidate.toLocaleLowerCase().includes(value))
    || item.routes.some(route => (
      route.route.name.toLocaleLowerCase().includes(value)
      || route.route.pathPattern.toLocaleLowerCase().includes(value)
      || route.route.method.toLocaleLowerCase().includes(value)
    ))
}

function baseProducts(
  routes: ActiveCatalogRoute[],
  filters: ReturnType<typeof normalizeFilters>
): CatalogProduct[] {
  const grouped = new Map<string, CatalogProduct>()
  for (const route of routes) {
    const current = grouped.get(route.route.productId)
    if (current) current.routes.push(route)
    else grouped.set(route.route.productId, {
      id: route.route.productId,
      routes: [route]
    })
  }
  return Array.from(grouped.values())
    .filter((item) => {
      const first = item.routes[0]
      return Boolean(
        first
        && matchesText(item, filters.keyword)
        && (
          filters.categoryId === undefined
          || first.product.categoryId === filters.categoryId
        )
      )
    })
    .sort((left, right) => {
      const leftFirst = left.routes[0]!
      const rightFirst = right.routes[0]!
      return (
        Math.max(...right.routes.map(route => route.publishedAt?.getTime() ?? 0))
        - Math.max(...left.routes.map(route => route.publishedAt?.getTime() ?? 0))
        || leftFirst.product.name.localeCompare(rightFirst.product.name)
        || leftFirst.route.productSlug.localeCompare(rightFirst.route.productSlug)
      )
    })
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

async function addProductStatuses(
  products: CatalogProduct[]
): Promise<StatusProduct[]> {
  const routes = await addStatuses(products.flatMap(product => product.routes))
  const routesById = new Map(routes.map(route => [route.route.id, route]))
  return products.map(product => ({
    id: product.id,
    routes: product.routes.flatMap((route) => {
      const statusRoute = routesById.get(route.route.id)
      return statusRoute ? [statusRoute] : []
    })
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

function aggregateStatus(routes: StatusRoute[]): number {
  const statuses = new Set(routes.map(route => route.status))
  if (statuses.size === 1) return routes[0]?.status ?? API_STATUS.unknown
  if (statuses.has(API_STATUS.maintenance)) return API_STATUS.maintenance
  if (statuses.has(API_STATUS.abnormal)) return API_STATUS.abnormal
  if (statuses.has(API_STATUS.deprecated)) return API_STATUS.deprecated
  if (statuses.has(API_STATUS.unknown)) return API_STATUS.unknown
  return API_STATUS.normal
}

function catalogEndpoint(
  item: StatusRoute,
  totalCalls: number
): ApiCatalogEndpoint {
  return {
    id: item.route.id,
    name: item.route.name,
    status: item.status,
    httpMethod: item.route.method,
    apiPath: item.route.pathPattern,
    isApiKey: item.route.isApiKey,
    creditsCost: item.route.creditsCost,
    totalCalls
  }
}

function catalogItem(
  item: StatusProduct,
  routeStats: Record<string, number>
): ApiCatalogItem {
  const first = item.routes[0]!
  const endpoints = item.routes
    .sort((left, right) => (
      left.route.pathPattern.localeCompare(right.route.pathPattern)
      || left.route.method.localeCompare(right.route.method)
    ))
    .map(route => catalogEndpoint(route, routeStats[route.route.id] ?? 0))
  return {
    id: item.id,
    name: first.product.name,
    status: aggregateStatus(item.routes),
    categoryId: first.product.categoryId,
    shortDesc: first.product.summary || first.product.name,
    description: first.product.description || first.product.summary,
    docUrl: '',
    endpoints,
    totalCalls: endpoints.reduce((sum, endpoint) => sum + endpoint.totalCalls, 0)
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
        const candidates = baseProducts(
          await activeRoutingCatalogService.list(),
          normalized
        )
        const withStatus = normalized.status === undefined
          ? null
          : (await addProductStatuses(candidates)).filter(
              item => aggregateStatus(item.routes) === normalized.status
            )
        const total = withStatus?.length ?? candidates.length
        const start = Math.min((normalized.page - 1) * normalized.pageSize, total)
        const pageProducts = withStatus
          ? withStatus.slice(start, start + normalized.pageSize)
          : await addProductStatuses(
              candidates.slice(start, start + normalized.pageSize)
            )
        const stats = await loadRouteStats(pageProducts.flatMap(
          item => item.routes.map(route => route.route.id)
        ))

        return {
          items: pageProducts.map(item => catalogItem(item, stats)),
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
