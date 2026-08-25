import type { RoutingRevisionRoute } from '~~/server/types/routing-revision'
import { normalizeRouteHost } from '~~/server/utils/route-pattern'

export interface RoutingRouteConflict {
  host: string
  method: string
  normalizedShape: string
  routeIds: [string, string]
}

/**
 * 没有自带 Host 的 Route 落在运行时默认域名上；默认域名为空时它接受任意 Host。
 */
function effectiveRouteHosts(
  route: RoutingRevisionRoute,
  defaultDomain: string | null
): string[] {
  if (route.hosts.length > 0) return route.hosts.map(normalizeRouteHost)
  return [defaultDomain ? normalizeRouteHost(defaultDomain) : '*']
}

/**
 * (host, method, path) 的唯一性由 HTTP 决定，因此判重覆盖整份运行快照。
 */
export function findRoutingRouteConflict(
  routes: RoutingRevisionRoute[],
  defaultDomain: string | null
): RoutingRouteConflict | null {
  const seen = new Map<string, string>()

  for (const route of routes) {
    for (const host of effectiveRouteHosts(route, defaultDomain)) {
      const key = `${host}|${route.method}|${route.normalizedShape}`
      const previousRouteId = seen.get(key)
      if (previousRouteId && previousRouteId !== route.id) {
        return {
          host,
          method: route.method,
          normalizedShape: route.normalizedShape,
          routeIds: [previousRouteId, route.id]
        }
      }
      seen.set(key, route.id)
    }
  }

  return null
}
