import { and, asc, eq, isNull } from 'drizzle-orm'
import { db } from '~~/server/db/client'
import { apiProducts, apiRoutes, apiVersions, upstreamServices } from '~~/server/db/schema'
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

export interface RouteMutationInput {
  apiVersionId: string
  name: string
  hosts: string[]
  method: 'GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  pathPattern: string
  upstreamServiceId: string
  upstreamPathTemplate: string
  isApiKey: boolean
  isStatistics: boolean
  creditsCost: number
  rateLimitPerSecond: number
  rateLimitPerMinute: number
  rateLimitPerHour: number
  rateLimitPerDay: number
  timeoutMs: number
  maxRequestBytes: number
  maxResponseBytes: number
  catalogStatus?: 'automatic' | 'maintenance'
  sensitiveQueryParameters?: string[]
  state: 'draft' | 'active' | 'disabled'
}

interface RouteMutationOptions {
  allowServiceManaged?: boolean
  managedBy?: 'manual' | 'service'
  isSupportRoute?: boolean
}

async function normalizeRouteMutation(input: RouteMutationInput) {
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

  const binding = firstRow(await db.select({
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
  if (binding.upstreamStatus !== 'active' || binding.upstreamDeletedAt) {
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
  async list(workspaceId?: string) {
    return db.select({
      route: apiRoutes,
      version: apiVersions,
      product: apiProducts,
      upstream: upstreamServices
    }).from(apiRoutes)
      .innerJoin(apiVersions, eq(apiVersions.id, apiRoutes.apiVersionId))
      .innerJoin(apiProducts, eq(apiProducts.id, apiVersions.productId))
      .innerJoin(upstreamServices, eq(upstreamServices.id, apiRoutes.upstreamServiceId))
      .where(and(
        isNull(apiRoutes.deletedAt),
        isNull(apiProducts.deletedAt),
        isNull(upstreamServices.deletedAt),
        workspaceId ? eq(apiProducts.workspaceId, workspaceId) : undefined
      ))
      .orderBy(asc(apiProducts.name), asc(apiVersions.version), asc(apiRoutes.pathPattern), asc(apiRoutes.method))
  },

  async create(input: RouteMutationInput, options: RouteMutationOptions = {}) {
    const values = await normalizeRouteMutation(input)
    try {
      return firstRow(await db.insert(apiRoutes).values({
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

  async get(id: string) {
    const binding = firstRow(await db.select({
      route: apiRoutes,
      version: apiVersions,
      product: apiProducts,
      upstream: upstreamServices
    }).from(apiRoutes)
      .innerJoin(apiVersions, eq(apiVersions.id, apiRoutes.apiVersionId))
      .innerJoin(apiProducts, eq(apiProducts.id, apiVersions.productId))
      .innerJoin(upstreamServices, eq(upstreamServices.id, apiRoutes.upstreamServiceId))
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
    return binding
  },

  async update(id: string, input: RouteMutationInput, options: RouteMutationOptions = {}) {
    const existing = firstRow(await db.select().from(apiRoutes)
      .where(and(eq(apiRoutes.id, id), isNull(apiRoutes.deletedAt)))
      .limit(1))
    if (!existing) {
      throw createApplicationError({ statusCode: 404, message: 'route not found', data: { code: 'ROUTE_NOT_FOUND' } })
    }
    assertMutableRoute(existing, options)
    const values = await normalizeRouteMutation(input)
    try {
      const updated = firstRow(await db.update(apiRoutes)
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
    const existing = firstRow(await db.select().from(apiRoutes)
      .where(and(eq(apiRoutes.id, id), isNull(apiRoutes.deletedAt)))
      .limit(1))
    if (!existing) {
      throw createApplicationError({ statusCode: 404, message: 'route not found', data: { code: 'ROUTE_NOT_FOUND' } })
    }
    assertMutableRoute(existing, options)
    if (await routingReferenceService.hasRoute(id)) {
      throw createApplicationError({
        statusCode: 409,
        message: 'disable and publish the route before deleting it',
        data: { code: 'ROUTE_STILL_PUBLISHED' }
      })
    }
    const now = new Date()
    const removed = firstRow(await db.update(apiRoutes)
      .set({ state: 'disabled', deletedAt: now, updatedAt: now })
      .where(and(eq(apiRoutes.id, id), isNull(apiRoutes.deletedAt)))
      .returning())
    if (!removed) {
      throw createApplicationError({ statusCode: 404, message: 'route not found', data: { code: 'ROUTE_NOT_FOUND' } })
    }
    return removed
  }
}
