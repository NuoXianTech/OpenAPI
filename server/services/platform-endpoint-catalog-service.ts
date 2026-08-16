import { createHash } from 'node:crypto'
import { and, eq, sql } from 'drizzle-orm'
import { db } from '~~/server/db/client'
import {
  apiProducts,
  apiVersions,
  environments,
  routingRevisions
} from '~~/server/db/schema'
import { createApplicationError } from '~~/server/errors/application-error'
import {
  platformRouteService,
  type RouteMutationInput
} from '~~/server/services/platform-route-service'
import { platformServiceControlService } from '~~/server/services/platform-service-control-service'
import { platformUpstreamService } from '~~/server/services/platform-upstream-service'
import { routingRevisionService } from '~~/server/services/routing-revision-service'
import type { RoutingRevisionRoute } from '~~/server/types/routing-revision'
import { canonicalJson } from '~~/server/utils/canonical-json'
import { parseRoutePathPattern } from '~~/server/utils/route-pattern'
import { firstRow } from '~~/server/utils/row'
import type { ServiceEndpointSummary } from '#shared/types/service-control'

type HttpMethod = 'GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS'
type RouteBinding = Awaited<ReturnType<typeof platformRouteService.list>>[number]
type UpstreamView = Awaited<ReturnType<typeof platformUpstreamService.list>>[number]
type PublicationStatus = 'available' | 'live' | 'pending' | 'retiring' | 'disabled'
type PublishedRevision = Awaited<ReturnType<typeof routingRevisionService.publish>>

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
}

interface CatalogItem {
  key: string
  sourceKind: 'discovered' | 'manual' | 'missing'
  endpoint: ServiceEndpointSummary | null
  route: RouteBinding | null
  status: PublicationStatus
  publishable: boolean
}

interface PublicationApplication {
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
    versionId: binding.version.id,
    version: binding.version.version,
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
    maxResponseBytes: binding.route.maxResponseBytes
  }
}

function publicationStatus(
  binding: RouteBinding | null,
  liveRoutes: ReadonlyMap<string, RoutingRevisionRoute>
): PublicationStatus {
  if (!binding) return 'available'
  const live = liveRoutes.get(binding.route.id)
  const desiredActive = binding.route.state === 'active'
  if (desiredActive && live
    && canonicalJson(routeSnapshot(binding)) === canonicalJson(live)) {
    return 'live'
  }
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

function endpointUpstreamTemplate(path: string): string {
  const parsed = parseRoutePathPattern(path)
  return parsed.pathPattern.replace(
    /\{([A-Za-z][A-Za-z0-9_]*)(\+)?\}/g,
    (_value, name: string) => `{path.${name}}`
  )
}

function routeMatchesEndpoint(
  binding: RouteBinding,
  endpoint: ServiceEndpointSummary
): boolean {
  return binding.route.method === endpoint.method
    && endpointShape(endpoint.path) !== null
    && endpointShape(endpoint.path)
    === upstreamTemplateShape(binding.route.upstreamPathTemplate)
}

function routePriority(
  binding: RouteBinding,
  liveRoutes: ReadonlyMap<string, RoutingRevisionRoute>
): number {
  const status = publicationStatus(binding, liveRoutes)
  if (status === 'live') return 0
  if (status === 'pending') return 1
  if (status === 'retiring') return 2
  return 3
}

function defaultVersion(path: string): string {
  return /^\/(v[0-9]+(?:[._-][A-Za-z0-9]+)?)\//.exec(path)?.[1] ?? 'v1'
}

function endpointGroupName(endpoint: ServiceEndpointSummary): string | null {
  return endpoint.tags.find(tag => tag !== 'System' && tag.trim())?.trim() ?? null
}

function normalizedProductSegment(value: string): string {
  const normalized = value.normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (normalized) return normalized
  return `group-${createHash('sha256').update(value).digest('hex').slice(0, 10)}`
}

function boundedProductSlug(value: string): string {
  if (value.length <= 80) return value
  const digest = createHash('sha256').update(value).digest('hex').slice(0, 8)
  return `${value.slice(0, 71).replace(/-+$/g, '')}-${digest}`
}

function endpointProductDefinition(input: {
  upstream: Pick<UpstreamView, 'slug'>
  serviceName: string
  endpoint: ServiceEndpointSummary
}) {
  const groupName = endpointGroupName(input.endpoint)
  if (!groupName) {
    return {
      slug: input.upstream.slug,
      name: input.serviceName,
      summary: `由 ${input.serviceName} 提供的接口`
    }
  }
  return {
    slug: boundedProductSlug(
      `${input.upstream.slug}-${normalizedProductSegment(groupName)}`
    ),
    name: groupName,
    summary: `由 ${input.serviceName} 提供的 ${groupName} 接口`
  }
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

async function applyDesiredRevision(
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

async function ensureEndpointVersion(input: {
  workspaceId: string
  upstream: UpstreamView
  serviceName: string
  endpoint: ServiceEndpointSummary
  existingRoutes: RouteBinding[]
}): Promise<string> {
  const definition = endpointProductDefinition(input)
  const versionName = defaultVersion(input.endpoint.path)
  const reusable = input.existingRoutes.find(binding => (
    binding.route.upstreamServiceId === input.upstream.id
    && binding.product.slug === definition.slug
    && binding.version.version === versionName
    && binding.product.lifecycle === 'active'
    && (binding.version.state === 'published'
      || binding.version.state === 'deprecated')
  ))
  if (reusable) return reusable.version.id

  return db.transaction(async (tx) => {
    let product = firstRow(await tx.insert(apiProducts).values({
      workspaceId: input.workspaceId,
      slug: definition.slug,
      name: definition.name,
      summary: definition.summary,
      visibility: 'public',
      lifecycle: 'active'
    }).onConflictDoNothing({
      target: [apiProducts.workspaceId, apiProducts.slug]
    }).returning())
    if (!product) {
      const existing = firstRow(await tx.select().from(apiProducts).where(and(
        eq(apiProducts.workspaceId, input.workspaceId),
        eq(apiProducts.slug, definition.slug)
      )).limit(1))
      if (existing?.deletedAt || (existing && existing.lifecycle !== 'active')) {
        product = firstRow(await tx.update(apiProducts).set({
          name: definition.name,
          summary: definition.summary,
          visibility: 'public',
          lifecycle: 'active',
          deletedAt: null,
          updatedAt: new Date()
        }).where(eq(apiProducts.id, existing.id)).returning())
      } else {
        product = existing
      }
    }
    if (!product) throw new Error('endpoint product could not be created')

    const publishedAt = new Date()
    let version = firstRow(await tx.insert(apiVersions).values({
      productId: product.id,
      version: versionName,
      state: 'published',
      openapiDocumentId: input.upstream.openapiDocumentId,
      publishedAt
    }).onConflictDoNothing({
      target: [apiVersions.productId, apiVersions.version]
    }).returning())
    if (!version) {
      version = firstRow(await tx.update(apiVersions).set({
        state: 'published',
        openapiDocumentId: input.upstream.openapiDocumentId,
        publishedAt: sql`coalesce(${apiVersions.publishedAt}, ${publishedAt})`,
        deprecatedAt: null,
        retiredAt: null
      }).where(and(
        eq(apiVersions.productId, product.id),
        eq(apiVersions.version, versionName)
      )).returning())
    }
    if (!version) throw new Error('endpoint product version could not be created')
    return version.id
  })
}

function routeMutationFromBinding(
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
    state: binding.route.state as RouteMutationInput['state'],
    ...patch
  }
}

function supportRouteHosts(bindings: RouteBinding[]): string[] {
  if (bindings.some(binding => binding.route.hosts.length === 0)) return []
  return Array.from(new Set(bindings.flatMap(binding => binding.route.hosts))).sort()
}

function endpointBelongsToProduct(input: {
  upstream: Pick<UpstreamView, 'slug'>
  serviceName: string
  endpoint: ServiceEndpointSummary
  productSlug: string
}): boolean {
  return endpointProductDefinition(input).slug === input.productSlug
}

async function synchronizeSupportRoutes(input: {
  workspaceId: string
  upstream: Pick<UpstreamView, 'id' | 'slug'>
  serviceName: string
  endpoint: ServiceEndpointSummary
  endpoints: ServiceEndpointSummary[]
  preferredVersionId?: string
}) {
  const productSlug = endpointProductDefinition(input).slug
  const versionName = defaultVersion(input.endpoint.path)
  const groupedEndpoints = input.endpoints.filter(endpoint => (
    !endpoint.system
    && defaultVersion(endpoint.path) === versionName
    && endpointBelongsToProduct({
      upstream: input.upstream,
      serviceName: input.serviceName,
      endpoint,
      productSlug
    })
  ))
  const supportEndpoints = groupedEndpoints.filter(endpoint => endpoint.support)
  if (supportEndpoints.length === 0) return

  const routes = (await platformRouteService.list(input.workspaceId)).filter(
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
    const candidates = routes.filter(binding => routeMatchesEndpoint(binding, endpoint))
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
          })
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
        routeMutationFromBinding(binding, { state: 'disabled' })
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
        })
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
    })
  }
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
              routePriority(left, liveRoutes) - routePriority(right, liveRoutes)
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
            status: publicationStatus(binding, liveRoutes),
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
          status: publicationStatus(binding, liveRoutes),
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
          })
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
        })
    if (!route) throw new Error('endpoint route could not be created')
    await synchronizeSupportRoutes({
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
      ...await applyDesiredRevision(input.environmentId, createdBy)
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
      state: input.enabled === undefined
        ? binding.route.state as 'draft' | 'active' | 'disabled'
        : input.enabled ? 'active' : 'disabled'
    })
    if (view && endpoint) {
      await synchronizeSupportRoutes({
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
      ...await applyDesiredRevision(input.environmentId, createdBy)
    }
  }
}
