import type { RoutingRevisionRoute } from '~~/server/types/routing-revision'
import { normalizeRouteHost } from '~~/server/utils/route-pattern'

export interface RoutingConflictScope {
  environmentId: string
  defaultDomain: string | null
  routes: RoutingRevisionRoute[]
}

export interface RoutingRouteConflict {
  host: string
  method: string
  normalizedShape: string
  routeIds: [string, string]
  environmentIds: [string, string]
}

function effectiveRouteHosts(route: RoutingRevisionRoute, defaultDomain: string | null): string[] {
  if (route.hosts.length > 0) return route.hosts.map(normalizeRouteHost)
  return [defaultDomain ? normalizeRouteHost(defaultDomain) : '*']
}

export function findRoutingRouteConflict(scopes: RoutingConflictScope[]): RoutingRouteConflict | null {
  const seen = new Map<string, { routeId: string, environmentId: string }>()

  for (const scope of scopes) {
    for (const route of scope.routes) {
      for (const host of effectiveRouteHosts(route, scope.defaultDomain)) {
        const key = `${host}|${route.method}|${route.normalizedShape}`
        const previous = seen.get(key)
        if (previous && (
          previous.routeId !== route.id
          || previous.environmentId !== scope.environmentId
        )) {
          return {
            host,
            method: route.method,
            normalizedShape: route.normalizedShape,
            routeIds: [previous.routeId, route.id],
            environmentIds: [previous.environmentId, scope.environmentId]
          }
        }
        seen.set(key, { routeId: route.id, environmentId: scope.environmentId })
      }
    }
  }

  return null
}
