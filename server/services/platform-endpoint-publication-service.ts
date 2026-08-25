import type { ServiceEndpointSummary } from '#shared/types/service-control'
import { db, type DatabaseTransaction } from '~~/server/db/client'
import {
  invalidateRoutingPublicationCaches,
  lockPlatformRuntime,
  routingRevisionService
} from '~~/server/services/routing-revision-service'
import type { RoutingRevisionRoute } from '~~/server/types/routing-revision'
import type {
  HttpMethod,
  PublicationStatus,
  RouteBinding,
  RouteMutationInput
} from '~~/server/types/platform-publication'
import { canonicalJson } from '~~/server/utils/canonical-json'
import { parseRoutePathPattern } from '~~/server/utils/route-pattern'
import { toRoutingRevisionRoute } from '~~/server/utils/routing-revision-route'

export interface PlatformPublication {
  revision: { id: string, sequence: number }
}

export function endpointPublicationStatus(
  binding: RouteBinding | null,
  liveRoutes: ReadonlyMap<string, RoutingRevisionRoute>
): PublicationStatus {
  if (!binding) return 'available'
  const live = liveRoutes.get(binding.route.id)
  const desiredActive = binding.route.state === 'active'
  if (
    desiredActive
    && live
    && canonicalJson(toRoutingRevisionRoute(binding)) === canonicalJson(live)
  ) return 'live'
  if (desiredActive) return 'pending'
  if (live) return 'retiring'
  return 'disabled'
}

function endpointShape(path: string): string | null {
  try {
    return parseRoutePathPattern(path).normalizedShape
  } catch {
    return null
  }
}

function upstreamTemplateShape(path: string): string | null {
  try {
    return parseRoutePathPattern(
      path.replace(/\{path\.([A-Za-z][A-Za-z0-9_]*)\}/g, '{$1}')
    ).normalizedShape
  } catch {
    return null
  }
}

export function endpointUpstreamTemplate(path: string): string {
  const parsed = parseRoutePathPattern(path)
  return parsed.pathPattern.replace(
    /\{([A-Za-z][A-Za-z0-9_]*)(\+)?\}/g,
    (_value, name: string) => `{path.${name}}`
  )
}

export function routeMatchesEndpoint(
  binding: RouteBinding,
  endpoint: ServiceEndpointSummary
): boolean {
  return binding.route.method === endpoint.method
    && endpointShape(endpoint.path) !== null
    && endpointShape(endpoint.path)
    === upstreamTemplateShape(binding.route.upstreamPathTemplate)
}

export function endpointRoutePriority(
  binding: RouteBinding,
  liveRoutes: ReadonlyMap<string, RoutingRevisionRoute>
): number {
  const status = endpointPublicationStatus(binding, liveRoutes)
  if (status === 'live') return 0
  if (status === 'pending') return 1
  if (status === 'retiring') return 2
  return 3
}

/** 只重新发布运行快照，不改动可发布配置。 */
export async function applyPlatformRevision(
  createdBy: number | null
): Promise<PlatformPublication> {
  const revision = await routingRevisionService.publish(createdBy)
  return { revision: { id: revision.id, sequence: revision.sequence } }
}

/**
 * 改动可发布配置后重新发布运行快照。提交与发布在同一事务里，
 * 并通过锁住运行时单行让并发发布串行。
 */
export async function applyPlatformMutation<T>(
  createdBy: number | null,
  mutate: (tx: DatabaseTransaction) => Promise<{
    value: T
    publishRouting?: boolean
  }>
) {
  const committed = await db.transaction(async (tx: DatabaseTransaction) => {
    await lockPlatformRuntime(tx)
    const mutation = await mutate(tx)
    const revision = mutation.publishRouting === false
      ? null
      : await routingRevisionService.publish(createdBy, { tx })
    return { ...mutation, revision }
  })
  if (committed.publishRouting !== false) {
    await invalidateRoutingPublicationCaches()
  }
  return {
    value: committed.value,
    revision: committed.revision
  }
}

export function routeMutationFromBinding(
  binding: RouteBinding,
  patch: Partial<RouteMutationInput> = {}
): RouteMutationInput {
  return {
    apiVersionId: binding.route.apiVersionId,
    name: binding.route.name,
    hosts: binding.route.hosts,
    method: binding.route.method as HttpMethod,
    pathPattern: binding.route.pathPattern,
    upstreamServiceId: binding.route.upstreamServiceId,
    upstreamPathTemplate: binding.route.upstreamPathTemplate,
    isApiKey: binding.route.isApiKey,
    isStatistics: binding.route.isStatistics,
    creditsCost: binding.route.creditsCost,
    rateLimitPerSecond: binding.route.rateLimitPerSecond,
    rateLimitPerMinute: binding.route.rateLimitPerMinute,
    rateLimitPerHour: binding.route.rateLimitPerHour,
    rateLimitPerDay: binding.route.rateLimitPerDay,
    timeoutMs: binding.route.timeoutMs,
    maxRequestBytes: binding.route.maxRequestBytes,
    maxResponseBytes: binding.route.maxResponseBytes,
    catalogStatus: binding.route.catalogStatus as RouteMutationInput['catalogStatus'],
    sensitiveQueryParameters: binding.route.sensitiveQueryParameters,
    state: binding.route.state as RouteMutationInput['state'],
    ...patch
  }
}
