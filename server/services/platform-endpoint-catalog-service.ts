import { eq } from 'drizzle-orm'
import { db } from '~~/server/db/client'
import { environments, routingRevisions } from '~~/server/db/schema'
import { createApplicationError } from '~~/server/errors/application-error'
import {
  platformRouteService,
  type RouteMutationInput
} from '~~/server/services/platform-route-service'
import {
  applyEndpointRevision,
  endpointPublicationStatus,
  endpointRoutePriority,
  endpointUpstreamTemplate,
  type HttpMethod,
  type PublicationStatus,
  type RouteBinding,
  routeMutationFromBinding,
  routeMatchesEndpoint
} from '~~/server/services/platform-endpoint-publication-service'
import { ensureEndpointVersion } from '~~/server/services/platform-endpoint-product-service'
import { synchronizeEndpointSupportRoutes } from '~~/server/services/platform-endpoint-support-route-service'
import { platformServiceControlService } from '~~/server/services/platform-service-control-service'
import { platformUpstreamService } from '~~/server/services/platform-upstream-service'
import { firstRow } from '~~/server/utils/row'
import type { ServiceEndpointSummary } from '#shared/types/service-control'

interface EndpointPublicationPatch {
  enabled?: boolean
  name?: string
  isApiKey?: boolean
  isStatistics?: boolean
  creditsCost?: number
  rateLimitPerSecond?: number
  rateLimitPerMinute?: number
  rateLimitPerHour?: number
  rateLimitPerDay?: number
  timeoutMs?: number
  maxRequestBytes?: number
  maxResponseBytes?: number
  catalogStatus?: 'automatic' | 'maintenance'
  sensitiveQueryParameters?: string[]
}

interface CatalogItem {
  key: string
  sourceKind: 'discovered' | 'manual' | 'missing'
  endpoint: ServiceEndpointSummary | null
  route: RouteBinding | null
  status: PublicationStatus
  publishable: boolean
}

async function loadEnvironment(environmentId: string, workspaceId?: string) {
  const environment = firstRow(await db.select().from(environments)
    .where(eq(environments.id, environmentId))
    .limit(1))
  if (!environment || (workspaceId && environment.workspaceId !== workspaceId)) {
    throw createApplicationError({
      statusCode: 404,
      message: 'environment not found in workspace',
      data: { code: 'ENVIRONMENT_NOT_FOUND' }
    })
  }
  return environment
}

async function activeRevision(environment: Awaited<ReturnType<typeof loadEnvironment>>) {
  if (!environment.activeRevisionId) return null
  return firstRow(await db.select().from(routingRevisions)
    .where(eq(routingRevisions.id, environment.activeRevisionId))
    .limit(1)) ?? null
}

export const platformEndpointCatalogService = {
  async list(workspaceId: string, environmentId: string) {
    const environment = await loadEnvironment(environmentId, workspaceId)
    const [upstreams, routes, revision] = await Promise.all([
      platformUpstreamService.list(workspaceId, { checkAvailability: true }),
      platformRouteService.list(workspaceId),
      activeRevision(environment)
    ])
    const liveRoutes = new Map(
      (revision?.configPayload.routes ?? []).map(route => [route.id, route])
    )
    const serviceViews = new Map<string, Awaited<ReturnType<
      typeof platformServiceControlService.get
    >>>()
    await Promise.all(upstreams
      .filter(upstream => upstream.kind === 'internal')
      .map(async (upstream) => {
        try {
          serviceViews.set(
            upstream.id,
            await platformServiceControlService.get(
              upstream.id,
              { checkAvailability: false }
            )
          )
        } catch {
          // An incomplete connection remains visible as an undiscovered Service.
        }
      }))

    const services = upstreams.map((upstream) => {
      const serviceRoutes = routes.filter(binding => (
        binding.route.upstreamServiceId === upstream.id
      ))
      const usedRouteIds = new Set<string>()
      const endpoints: CatalogItem[] = (
        serviceViews.get(upstream.id)?.endpoints ?? []
      )
        .filter(endpoint => !endpoint.system)
        .flatMap((endpoint) => {
          const candidates = serviceRoutes
            .filter(binding => (
              !usedRouteIds.has(binding.route.id)
              && routeMatchesEndpoint(binding, endpoint)
            ))
            .sort((left, right) => (
              endpointRoutePriority(left, liveRoutes)
              - endpointRoutePriority(right, liveRoutes)
            ))
          if (endpoint.support) {
            for (const candidate of candidates) {
              usedRouteIds.add(candidate.route.id)
            }
            return []
          }
          const binding = candidates[0] ?? null
          if (binding) usedRouteIds.add(binding.route.id)
          let publishable = true
          try {
            endpointUpstreamTemplate(endpoint.path)
          } catch {
            publishable = false
          }
          return [{
            key: `${upstream.id}:${endpoint.method}:${endpoint.path}:${binding?.route.id ?? 'source'}`,
            sourceKind: 'discovered' as const,
            endpoint,
            route: binding,
            status: endpointPublicationStatus(binding, liveRoutes),
            publishable
          }]
        })

      for (const binding of serviceRoutes) {
        if (usedRouteIds.has(binding.route.id)) continue
        endpoints.push({
          key: `${upstream.id}:route:${binding.route.id}`,
          sourceKind: upstream.kind === 'external'
            ? 'manual' as const
            : 'missing' as const,
          endpoint: null,
          route: binding,
          status: endpointPublicationStatus(binding, liveRoutes),
          publishable: true
        })
      }
      return { upstream, endpoints }
    })

    const items = services.flatMap(service => service.endpoints)
    return {
      workspaceId,
      environmentId,
      activeRevisionId: revision?.id ?? null,
      activeRevisionSequence: revision?.sequence ?? null,
      services,
      totals: {
        discovered: items.filter(item => item.sourceKind === 'discovered').length,
        live: items.filter(item => item.status === 'live').length,
        available: items.filter(item => item.status === 'available').length,
        pending: items.filter(item => (
          item.status === 'pending' || item.status === 'retiring'
        )).length,
        disabled: items.filter(item => item.status === 'disabled').length
      }
    }
  },

  async publish(input: {
    environmentId: string
    upstreamServiceId: string
    method: HttpMethod
    path: string
  }, createdBy: number | null) {
    const upstream = await platformUpstreamService.findById(input.upstreamServiceId)
    if (!upstream || upstream.kind !== 'internal' || upstream.deletedAt) {
      throw createApplicationError({
        statusCode: 404,
        message: 'internal Service upstream not found',
        data: { code: 'SERVICE_UPSTREAM_NOT_FOUND' }
      })
    }
    if (upstream.status !== 'active') {
      throw createApplicationError({
        statusCode: 409,
        message: 'Service upstream is disabled',
        data: { code: 'UPSTREAM_NOT_ACTIVE' }
      })
    }
    await loadEnvironment(input.environmentId, upstream.workspaceId)
    const view = await platformServiceControlService.get(
      upstream.id,
      { checkAvailability: false }
    )
    const endpoint = view.endpoints.find(item => (
      !item.system
      && !item.support
      && item.method === input.method
      && item.path === input.path
    ))
    if (!endpoint) {
      throw createApplicationError({
        statusCode: 404,
        message: 'discovered Service endpoint not found',
        data: { code: 'SERVICE_ENDPOINT_NOT_FOUND' }
      })
    }

    const existingRoutes = await platformRouteService.list(upstream.workspaceId)
    const existing = existingRoutes
      .filter(binding => (
        binding.route.upstreamServiceId === upstream.id
        && routeMatchesEndpoint(binding, endpoint)
      ))
      .sort((left, right) => (
        Number(right.route.state === 'active')
        - Number(left.route.state === 'active')
      ))[0]
    const upstreamView = (await platformUpstreamService.list(
      upstream.workspaceId,
      { checkAvailability: false }
    ))
      .find(item => item.id === upstream.id)
    if (!upstreamView) throw new Error('upstream view disappeared during publication')
    const apiVersionId = await ensureEndpointVersion({
      workspaceId: upstream.workspaceId,
      upstream: upstreamView,
      serviceName: view.connection.serviceName ?? upstream.name,
      endpoint,
      existingRoutes
    })
    const route = existing
      ? await platformRouteService.update(
          existing.route.id,
          routeMutationFromBinding(existing, {
            apiVersionId,
            state: 'active'
          }),
          { allowServiceManaged: true }
        )
      : await platformRouteService.create({
          apiVersionId,
          name: endpoint.summary
            ?? endpoint.operationId
            ?? `${endpoint.method} ${endpoint.path}`,
          hosts: [],
          method: input.method,
          pathPattern: endpoint.path,
          upstreamServiceId: upstream.id,
          upstreamPathTemplate: endpointUpstreamTemplate(endpoint.path),
          isApiKey: false,
          isStatistics: true,
          creditsCost: 0,
          rateLimitPerSecond: 0,
          rateLimitPerMinute: 0,
          rateLimitPerHour: 0,
          rateLimitPerDay: 0,
          timeoutMs: 10_000,
          maxRequestBytes: 1024 * 1024,
          maxResponseBytes: 10 * 1024 * 1024,
          state: 'active'
        }, { managedBy: 'service' })
    if (!route) throw new Error('endpoint route could not be created')
    await synchronizeEndpointSupportRoutes({
      workspaceId: upstream.workspaceId,
      upstream: upstreamView,
      serviceName: view.connection.serviceName ?? upstream.name,
      endpoint,
      endpoints: view.endpoints,
      preferredVersionId: route.apiVersionId
    })
    return {
      route,
      created: !existing,
      ...await applyEndpointRevision(input.environmentId, createdBy)
    }
  },

  async update(
    routeId: string,
    input: EndpointPublicationPatch & { environmentId: string },
    createdBy: number | null
  ) {
    const binding = await platformRouteService.get(routeId)
    await loadEnvironment(input.environmentId, binding.product.workspaceId)
    const view = binding.upstream.kind === 'internal'
      ? await platformServiceControlService.get(
          binding.upstream.id,
          { checkAvailability: false }
        )
      : null
    const endpoint = view?.endpoints.find(item => (
      !item.system && routeMatchesEndpoint(binding, item)
    )) ?? null
    if (endpoint?.support) {
      throw createApplicationError({
        statusCode: 404,
        message: 'support routes are managed automatically',
        data: { code: 'SUPPORT_ROUTE_NOT_MANAGEABLE' }
      })
    }
    const route = await platformRouteService.update(routeId, {
      apiVersionId: binding.route.apiVersionId,
      name: input.name ?? binding.route.name,
      hosts: binding.route.hosts,
      method: binding.route.method as HttpMethod,
      pathPattern: binding.route.pathPattern,
      upstreamServiceId: binding.route.upstreamServiceId,
      upstreamPathTemplate: binding.route.upstreamPathTemplate,
      isApiKey: input.isApiKey ?? binding.route.isApiKey,
      isStatistics: input.isStatistics ?? binding.route.isStatistics,
      creditsCost: input.creditsCost ?? binding.route.creditsCost,
      rateLimitPerSecond:
        input.rateLimitPerSecond ?? binding.route.rateLimitPerSecond,
      rateLimitPerMinute:
        input.rateLimitPerMinute ?? binding.route.rateLimitPerMinute,
      rateLimitPerHour:
        input.rateLimitPerHour ?? binding.route.rateLimitPerHour,
      rateLimitPerDay:
        input.rateLimitPerDay ?? binding.route.rateLimitPerDay,
      timeoutMs: input.timeoutMs ?? binding.route.timeoutMs,
      maxRequestBytes: input.maxRequestBytes ?? binding.route.maxRequestBytes,
      maxResponseBytes: input.maxResponseBytes ?? binding.route.maxResponseBytes,
      catalogStatus: input.catalogStatus
        ?? binding.route.catalogStatus as RouteMutationInput['catalogStatus'],
      sensitiveQueryParameters: input.sensitiveQueryParameters
        ?? binding.route.sensitiveQueryParameters,
      state: input.enabled === undefined
        ? binding.route.state as 'draft' | 'active' | 'disabled'
        : input.enabled ? 'active' : 'disabled'
    }, { allowServiceManaged: true })
    if (view && endpoint) {
      await synchronizeEndpointSupportRoutes({
        workspaceId: binding.product.workspaceId,
        upstream: binding.upstream,
        serviceName: view.connection.serviceName ?? binding.upstream.name,
        endpoint,
        endpoints: view.endpoints,
        preferredVersionId: route.apiVersionId
      })
    }
    return {
      route,
      ...await applyEndpointRevision(input.environmentId, createdBy)
    }
  }
}
