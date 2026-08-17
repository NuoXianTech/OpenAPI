import type {
  apiProducts,
  apiRoutes,
  apiVersions
} from '~~/server/db/schema'
import type { RoutingRevisionRoute } from '~~/server/types/routing-revision'

interface RoutingRevisionRouteSource {
  route: typeof apiRoutes.$inferSelect
  product: typeof apiProducts.$inferSelect
  version: typeof apiVersions.$inferSelect
}

export function toRoutingRevisionRoute(
  source: RoutingRevisionRouteSource
): RoutingRevisionRoute {
  return {
    id: source.route.id,
    productId: source.product.id,
    productSlug: source.product.slug,
    productVisibility:
      source.product.visibility as RoutingRevisionRoute['productVisibility'],
    productLifecycle:
      source.product.lifecycle as RoutingRevisionRoute['productLifecycle'],
    versionId: source.version.id,
    version: source.version.version,
    versionState:
      source.version.state as RoutingRevisionRoute['versionState'],
    name: source.route.name,
    hosts: [...source.route.hosts].sort(),
    method: source.route.method,
    pathPattern: source.route.pathPattern,
    normalizedShape: source.route.normalizedShape,
    upstreamServiceId: source.route.upstreamServiceId,
    upstreamPathTemplate: source.route.upstreamPathTemplate,
    isApiKey: source.route.isApiKey,
    isStatistics: source.route.isStatistics,
    creditsCost: source.route.creditsCost,
    rateLimitPerSecond: source.route.rateLimitPerSecond,
    rateLimitPerMinute: source.route.rateLimitPerMinute,
    rateLimitPerHour: source.route.rateLimitPerHour,
    rateLimitPerDay: source.route.rateLimitPerDay,
    timeoutMs: source.route.timeoutMs,
    maxRequestBytes: source.route.maxRequestBytes,
    maxResponseBytes: source.route.maxResponseBytes,
    catalogStatus:
      source.route.catalogStatus as RoutingRevisionRoute['catalogStatus'],
    sensitiveQueryParameters: [...source.route.sensitiveQueryParameters].sort(),
    isSupportRoute: source.route.isSupportRoute
  }
}
