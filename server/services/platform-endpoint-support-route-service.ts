import type { ServiceEndpointSummary } from '#shared/types/service-control'
import type { DatabaseTransaction } from '~~/server/db/client'
import {
  endpointDefaultVersion,
  endpointProductDefinition
} from '~~/server/services/platform-endpoint-product-service'
import {
  endpointUpstreamTemplate,
  routeMatchesEndpoint,
  routeMutationFromBinding
} from '~~/server/services/platform-endpoint-publication-service'
import type {
  HttpMethod,
  RouteBinding,
  UpstreamView
} from '~~/server/types/platform-publication'
import { platformRouteService } from '~~/server/services/platform-route-service'

function supportRouteHosts(bindings: RouteBinding[]): string[] {
  if (bindings.some(binding => binding.route.hosts.length === 0)) return []
  return Array.from(new Set(
    bindings.flatMap(binding => binding.route.hosts)
  )).sort()
}

function endpointBelongsToProduct(input: {
  upstream: Pick<UpstreamView, 'slug'>
  serviceName: string
  endpoint: ServiceEndpointSummary
  productSlug: string
}): boolean {
  return endpointProductDefinition(input).slug === input.productSlug
}

export async function synchronizeEndpointSupportRoutes(input: {
  workspaceId: string
  upstream: Pick<UpstreamView, 'id' | 'slug'>
  serviceName: string
  endpoint: ServiceEndpointSummary
  endpoints: ServiceEndpointSummary[]
  preferredVersionId?: string
  transaction?: DatabaseTransaction
}) {
  const productSlug = endpointProductDefinition(input).slug
  const versionName = endpointDefaultVersion(input.endpoint.path)
  const groupedEndpoints = input.endpoints.filter(endpoint => (
    !endpoint.system
    && endpointDefaultVersion(endpoint.path) === versionName
    && endpointBelongsToProduct({
      upstream: input.upstream,
      serviceName: input.serviceName,
      endpoint,
      productSlug
    })
  ))
  const supportEndpoints = groupedEndpoints.filter(endpoint => endpoint.support)
  if (supportEndpoints.length === 0) return

  const routes = (await platformRouteService.list(input.workspaceId, {
    transaction: input.transaction
  })).filter(
    binding => binding.route.upstreamServiceId === input.upstream.id
  )
  const publicEndpoints = groupedEndpoints.filter(endpoint => !endpoint.support)
  const activePublicRoutes = routes.filter(binding => (
    binding.route.state === 'active'
    && publicEndpoints.some(endpoint => routeMatchesEndpoint(binding, endpoint))
  ))
  const supportEnabled = activePublicRoutes.length > 0
  const supportHosts = supportRouteHosts(activePublicRoutes)
  const versionId = input.preferredVersionId
    ?? activePublicRoutes[0]?.route.apiVersionId

  for (const endpoint of supportEndpoints) {
    const candidates = routes.filter(binding => (
      routeMatchesEndpoint(binding, endpoint)
    ))
    if (!supportEnabled) {
      await Promise.all(candidates
        .filter(binding => binding.route.state !== 'disabled')
        .map(binding => platformRouteService.update(
          binding.route.id,
          routeMutationFromBinding(binding, {
            isApiKey: false,
            isStatistics: false,
            creditsCost: 0,
            rateLimitPerSecond: 0,
            rateLimitPerMinute: 0,
            rateLimitPerHour: 0,
            rateLimitPerDay: 0,
            state: 'disabled'
          }),
          {
            allowServiceManaged: true,
            transaction: input.transaction
          }
        )))
      continue
    }

    if (!versionId) {
      throw new Error('support route requires an active endpoint version')
    }
    const selected = candidates.find(binding => (
      binding.route.apiVersionId === versionId
    ))
    ?? candidates.find(binding => binding.route.state === 'active')
    ?? candidates[0]
    await Promise.all(candidates
      .filter(binding => binding.route.id !== selected?.route.id)
      .filter(binding => binding.route.state !== 'disabled')
      .map(binding => platformRouteService.update(
        binding.route.id,
        routeMutationFromBinding(binding, { state: 'disabled' }),
        {
          allowServiceManaged: true,
          transaction: input.transaction
        }
      )))

    const name = endpoint.summary
      ?? endpoint.operationId
      ?? `${endpoint.method} ${endpoint.path}`
    if (selected) {
      await platformRouteService.update(
        selected.route.id,
        routeMutationFromBinding(selected, {
          apiVersionId: versionId,
          name,
          hosts: supportHosts,
          method: endpoint.method as HttpMethod,
          pathPattern: endpoint.path,
          upstreamPathTemplate: endpointUpstreamTemplate(endpoint.path),
          isApiKey: false,
          isStatistics: false,
          creditsCost: 0,
          rateLimitPerSecond: 0,
          rateLimitPerMinute: 0,
          rateLimitPerHour: 0,
          rateLimitPerDay: 0,
          state: 'active'
        }),
        {
          allowServiceManaged: true,
          transaction: input.transaction
        }
      )
      continue
    }
    await platformRouteService.create({
      apiVersionId: versionId,
      name,
      hosts: supportHosts,
      method: endpoint.method as HttpMethod,
      pathPattern: endpoint.path,
      upstreamServiceId: input.upstream.id,
      upstreamPathTemplate: endpointUpstreamTemplate(endpoint.path),
      isApiKey: false,
      isStatistics: false,
      creditsCost: 0,
      rateLimitPerSecond: 0,
      rateLimitPerMinute: 0,
      rateLimitPerHour: 0,
      rateLimitPerDay: 0,
      timeoutMs: 10_000,
      maxRequestBytes: 1024 * 1024,
      maxResponseBytes: 10 * 1024 * 1024,
      state: 'active'
    }, {
      managedBy: 'service',
      isSupportRoute: true,
      transaction: input.transaction
    })
  }
}
