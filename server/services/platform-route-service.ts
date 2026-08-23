import { and, asc, eq, isNull } from 'drizzle-orm'
import { db, type DatabaseTransaction } from '~~/server/db/client'
import {
  apiProducts,
  apiRoutes,
  apiVersions,
  upstreamServiceConnections,
  upstreamServices
} from '~~/server/db/schema'
import { createApplicationError } from '~~/server/errors/application-error'
import { getSqlState } from '~~/server/utils/database-error'
import {
  isReservedPlatformPath,
  normalizeRouteHost,
  parseRoutePathPattern,
  validateUpstreamPathTemplate
} from '~~/server/utils/route-pattern'
import { firstRow } from '~~/server/utils/row'
import { routingReferenceService } from '~~/server/services/routing-reference-service'
import { applyWorkspaceMutation } from '~~/server/services/platform-endpoint-publication-service'
import type { RouteBinding, RouteMutationInput } from '~~/server/types/platform-publication'

interface RouteMutationOptions {
  allowServiceManaged?: boolean
  managedBy?: 'manual' | 'service'
  isSupportRoute?: boolean
  transaction?: DatabaseTransaction
}

async function normalizeRouteMutation(
  input: RouteMutationInput,
  transaction?: DatabaseTransaction,
  currentUpstreamServiceId?: string
) {
  if (input.creditsCost > 0 && (!input.isApiKey || !input.isStatistics)) {
    throw createApplicationError({
      statusCode: 400,
      message: 'paid routes require API Key authentication and statistics',
      data: { code: 'ROUTE_PAID_POLICY_INVALID' }
    })
  }
  const parsedPath = parseRoutePathPattern(input.pathPattern)
  if (isReservedPlatformPath(parsedPath.pathPattern)) {
    throw createApplicationError({
      statusCode: 400,
      message: 'route path overlaps a reserved Platform path',
      data: { code: 'ROUTE_PATH_RESERVED' }
    })
  }
  const upstreamPathTemplate = validateUpstreamPathTemplate(input.upstreamPathTemplate, parsedPath.parameterNames)
  const hosts = Array.from(new Set(input.hosts.map(normalizeRouteHost))).sort()
  const sensitiveQueryParameters = Array.from(new Set(
    (input.sensitiveQueryParameters ?? [])
      .map(value => value.trim().toLowerCase())
      .filter(Boolean)
  )).sort()

  const executor = transaction ?? db
  const binding = firstRow(await executor.select({
    productWorkspaceId: apiProducts.workspaceId,
    upstreamWorkspaceId: upstreamServices.workspaceId,
    upstreamStatus: upstreamServices.status,
    upstreamDeletedAt: upstreamServices.deletedAt
  }).from(apiVersions)
    .innerJoin(apiProducts, eq(apiProducts.id, apiVersions.productId))
    .innerJoin(upstreamServices, eq(upstreamServices.id, input.upstreamServiceId))
    .where(and(eq(apiVersions.id, input.apiVersionId), isNull(apiProducts.deletedAt)))
    .limit(1))

  if (!binding) {
    throw createApplicationError({ statusCode: 404, message: 'API version or upstream not found', data: { code: 'ROUTE_BINDING_NOT_FOUND' } })
  }
  if (binding.productWorkspaceId !== binding.upstreamWorkspaceId) {
    throw createApplicationError({ statusCode: 400, message: 'route and upstream must belong to the same workspace', data: { code: 'ROUTE_WORKSPACE_MISMATCH' } })
  }
  if (
    binding.upstreamDeletedAt
    || (
      binding.upstreamStatus !== 'active'
      && input.upstreamServiceId !== currentUpstreamServiceId
    )
  ) {
    throw createApplicationError({ statusCode: 409, message: 'upstream is not active', data: { code: 'UPSTREAM_NOT_ACTIVE' } })
  }

  return {
    apiVersionId: input.apiVersionId,
    name: input.name,
    hosts,
    method: input.method,
    pathPattern: parsedPath.pathPattern,
    normalizedShape: parsedPath.normalizedShape,
    upstreamServiceId: input.upstreamServiceId,
    upstreamPathTemplate,
    isApiKey: input.isApiKey,
    isStatistics: input.isStatistics,
    creditsCost: input.creditsCost,
    rateLimitPerSecond: input.rateLimitPerSecond,
    rateLimitPerMinute: input.rateLimitPerMinute,
    rateLimitPerHour: input.rateLimitPerHour,
    rateLimitPerDay: input.rateLimitPerDay,
    timeoutMs: input.timeoutMs,
    maxRequestBytes: input.maxRequestBytes,
    maxResponseBytes: input.maxResponseBytes,
    catalogStatus: input.catalogStatus ?? 'automatic',
    sensitiveQueryParameters,
    state: input.state
  }
}

function assertMutableRoute(
  route: typeof apiRoutes.$inferSelect,
  options: RouteMutationOptions
): void {
  if (route.managedBy === 'service' && !options.allowServiceManaged) {
    throw createApplicationError({
      statusCode: 409,
      message: 'Service routes must be changed through the endpoint catalog',
      data: { code: 'SERVICE_ROUTE_MANAGED', isSupportRoute: route.isSupportRoute }
    })
  }
}

export const platformRouteService = {
  async list(
    workspaceId?: string,
    options: { transaction?: DatabaseTransaction } = {}
  ): Promise<RouteBinding[]> {
    const executor = options.transaction ?? db
    const rows = await executor.select({
      route: apiRoutes,
      version: apiVersions,
      product: apiProducts,
      upstream: upstreamServices,
      serviceManaged: upstreamServiceConnections.upstreamServiceId
    }).from(apiRoutes)
      .innerJoin(apiVersions, eq(apiVersions.id, apiRoutes.apiVersionId))
      .innerJoin(apiProducts, eq(apiProducts.id, apiVersions.productId))
      .innerJoin(upstreamServices, eq(upstreamServices.id, apiRoutes.upstreamServiceId))
      .leftJoin(upstreamServiceConnections, eq(
        upstreamServiceConnections.upstreamServiceId,
        upstreamServices.id
      ))
      .where(and(
        isNull(apiRoutes.deletedAt),
        isNull(apiProducts.deletedAt),
        isNull(upstreamServices.deletedAt),
        workspaceId ? eq(apiProducts.workspaceId, workspaceId) : undefined
      ))
      .orderBy(asc(apiProducts.name), asc(apiVersions.version), asc(apiRoutes.pathPattern), asc(apiRoutes.method))
    return rows.map(row => ({
      ...row,
      upstream: { ...row.upstream, serviceManaged: Boolean(row.serviceManaged) }
    }))
  },

  async create(input: RouteMutationInput, options: RouteMutationOptions = {}) {
    const executor = options.transaction ?? db
    const values = await normalizeRouteMutation(input, options.transaction)
    try {
      return firstRow(await executor.insert(apiRoutes).values({
        ...values,
        managedBy: options.managedBy ?? 'manual',
        isSupportRoute: options.isSupportRoute ?? false
      }).returning())
    } catch (error) {
      if (getSqlState(error) === '23505') {
        throw createApplicationError({ statusCode: 409, message: 'route conflicts with an existing method and path shape', data: { code: 'ROUTE_CONFLICT' } })
      }
      throw error
    }
  },

  async get(
    id: string,
    options: { transaction?: DatabaseTransaction } = {}
  ): Promise<RouteBinding> {
    const executor = options.transaction ?? db
    const binding = firstRow(await executor.select({
      route: apiRoutes,
      version: apiVersions,
      product: apiProducts,
      upstream: upstreamServices,
      serviceManaged: upstreamServiceConnections.upstreamServiceId
    }).from(apiRoutes)
      .innerJoin(apiVersions, eq(apiVersions.id, apiRoutes.apiVersionId))
      .innerJoin(apiProducts, eq(apiProducts.id, apiVersions.productId))
      .innerJoin(upstreamServices, eq(upstreamServices.id, apiRoutes.upstreamServiceId))
      .leftJoin(upstreamServiceConnections, eq(
        upstreamServiceConnections.upstreamServiceId,
        upstreamServices.id
      ))
      .where(and(
        eq(apiRoutes.id, id),
        isNull(apiRoutes.deletedAt),
        isNull(apiProducts.deletedAt),
        isNull(upstreamServices.deletedAt)
      ))
      .limit(1))
    if (!binding) {
      throw createApplicationError({
        statusCode: 404,
        message: 'route not found',
        data: { code: 'ROUTE_NOT_FOUND' }
      })
    }
    return {
      ...binding,
      upstream: { ...binding.upstream, serviceManaged: Boolean(binding.serviceManaged) }
    }
  },

  async update(id: string, input: RouteMutationInput, options: RouteMutationOptions = {}) {
    const executor = options.transaction ?? db
    const existing = firstRow(await executor.select().from(apiRoutes)
      .where(and(eq(apiRoutes.id, id), isNull(apiRoutes.deletedAt)))
      .limit(1))
    if (!existing) {
      throw createApplicationError({ statusCode: 404, message: 'route not found', data: { code: 'ROUTE_NOT_FOUND' } })
    }
    assertMutableRoute(existing, options)
    const values = await normalizeRouteMutation(
      input,
      options.transaction,
      existing.upstreamServiceId
    )
    try {
      const updated = firstRow(await executor.update(apiRoutes)
        .set({ ...values, updatedAt: new Date() })
        .where(and(eq(apiRoutes.id, id), isNull(apiRoutes.deletedAt)))
        .returning())
      if (!updated) {
        throw createApplicationError({ statusCode: 404, message: 'route not found', data: { code: 'ROUTE_NOT_FOUND' } })
      }
      return updated
    } catch (error) {
      if (getSqlState(error) === '23505') {
        throw createApplicationError({ statusCode: 409, message: 'route conflicts with an existing method and path shape', data: { code: 'ROUTE_CONFLICT' } })
      }
      throw error
    }
  },

  async remove(id: string, options: RouteMutationOptions = {}) {
    const executor = options.transaction ?? db
    const existing = firstRow(await executor.select().from(apiRoutes)
      .where(and(eq(apiRoutes.id, id), isNull(apiRoutes.deletedAt)))
      .limit(1))
    if (!existing) {
      throw createApplicationError({ statusCode: 404, message: 'route not found', data: { code: 'ROUTE_NOT_FOUND' } })
    }
    assertMutableRoute(existing, options)
    if (await routingReferenceService.hasRoute(id, options.transaction)) {
      throw createApplicationError({
        statusCode: 409,
        message: 'disable and publish the route before deleting it',
        data: { code: 'ROUTE_STILL_PUBLISHED' }
      })
    }
    const now = new Date()
    const removed = firstRow(await executor.update(apiRoutes)
      .set({ state: 'disabled', deletedAt: now, updatedAt: now })
      .where(and(eq(apiRoutes.id, id), isNull(apiRoutes.deletedAt)))
      .returning())
    if (!removed) {
      throw createApplicationError({ statusCode: 404, message: 'route not found', data: { code: 'ROUTE_NOT_FOUND' } })
    }
    return removed
  },

  async createAndPublish(
    input: RouteMutationInput,
    createdBy: number | null
  ) {
    const committed = await applyWorkspaceMutation(createdBy, async (tx) => {
      const route = await platformRouteService.create(input, {
        transaction: tx
      })
      if (!route) throw new Error('route insert returned no row')
      const binding = await platformRouteService.get(route.id, {
        transaction: tx
      })
      return {
        value: route,
        workspaceId: binding.product.workspaceId
      }
    })
    const { value: route, ...publication } = committed
    return { route, ...publication }
  },

  async updateAndPublish(
    id: string,
    input: RouteMutationInput,
    createdBy: number | null
  ) {
    const committed = await applyWorkspaceMutation(createdBy, async (tx) => {
      const route = await platformRouteService.update(id, input, {
        transaction: tx
      })
      const binding = await platformRouteService.get(route.id, {
        transaction: tx
      })
      return {
        value: route,
        workspaceId: binding.product.workspaceId
      }
    })
    const { value: route, ...publication } = committed
    return { route, ...publication }
  },

  async removeAndPublish(id: string, createdBy: number | null) {
    const committed = await applyWorkspaceMutation(createdBy, async (tx) => {
      const binding = await platformRouteService.get(id, {
        transaction: tx
      })
      const route = await platformRouteService.remove(id, {
        transaction: tx
      })
      return {
        value: route,
        workspaceId: binding.product.workspaceId
      }
    })
    const { value: route, ...publication } = committed
    return { route, ...publication }
  }
}
