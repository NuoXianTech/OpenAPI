import type { ServiceEndpointSummary } from '#shared/types/service-control'
import type {
  platformRouteService,
  RouteMutationInput
} from '~~/server/services/platform-route-service'
import type { platformUpstreamService } from '~~/server/services/platform-upstream-service'
import { routingRevisionService } from '~~/server/services/routing-revision-service'
import type { RoutingRevisionRoute } from '~~/server/types/routing-revision'
import { canonicalJson } from '~~/server/utils/canonical-json'
import { parseRoutePathPattern } from '~~/server/utils/route-pattern'

export type HttpMethod = 'GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
export type RouteBinding = Awaited<
  ReturnType<typeof platformRouteService.list>
>[number]
export type UpstreamView = Awaited<
  ReturnType<typeof platformUpstreamService.list>
>[number]
export type PublicationStatus
  = | 'available'
    | 'live'
    | 'pending'
    | 'retiring'
    | 'disabled'

type PublishedRevision = Awaited<
  ReturnType<typeof routingRevisionService.publish>
>

export interface PublicationApplication {
  applied: boolean
  revision: PublishedRevision | null
  publicationError: {
    code: string
    message: string
  } | null
}

function routeSnapshot(binding: RouteBinding): RoutingRevisionRoute {
  return {
    id: binding.route.id,
    productId: binding.product.id,
    productSlug: binding.product.slug,
    productVisibility: binding.product.visibility as RoutingRevisionRoute['productVisibility'],
    productLifecycle: binding.product.lifecycle as RoutingRevisionRoute['productLifecycle'],
    versionId: binding.version.id,
    version: binding.version.version,
    versionState: binding.version.state as RoutingRevisionRoute['versionState'],
    name: binding.route.name,
    hosts: [...binding.route.hosts].sort(),
    method: binding.route.method,
    pathPattern: binding.route.pathPattern,
    normalizedShape: binding.route.normalizedShape,
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
    catalogStatus: binding.route.catalogStatus as RoutingRevisionRoute['catalogStatus'],
    sensitiveQueryParameters: binding.route.sensitiveQueryParameters,
    isSupportRoute: binding.route.isSupportRoute
  }
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
    && canonicalJson(routeSnapshot(binding)) === canonicalJson(live)
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

function describePublicationError(error: unknown) {
  const message = error instanceof Error && error.message.trim()
    ? error.message
    : 'routing configuration could not be applied'
  if (!error || typeof error !== 'object' || !('data' in error)) {
    return { code: 'ROUTING_PUBLICATION_FAILED', message }
  }
  const data = error.data
  const code = data && typeof data === 'object' && 'code' in data
    && typeof data.code === 'string'
    ? data.code
    : 'ROUTING_PUBLICATION_FAILED'
  return { code, message }
}

export async function applyEndpointRevision(
  environmentId: string,
  createdBy: number | null
): Promise<PublicationApplication> {
  try {
    return {
      applied: true,
      revision: await routingRevisionService.publish(environmentId, createdBy),
      publicationError: null
    }
  } catch (error) {
    return {
      applied: false,
      revision: null,
      publicationError: describePublicationError(error)
    }
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
