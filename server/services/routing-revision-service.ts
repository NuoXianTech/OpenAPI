import { createHash, randomUUID } from 'node:crypto'
import { and, desc, eq, inArray, isNull, max } from 'drizzle-orm'
import { db } from '~~/server/db/client'
import {
  apiProducts,
  apiRoutes,
  apiVersions,
  environments,
  routingRevisions,
  upstreamServices,
  upstreamTargets
} from '~~/server/db/schema'
import { createApplicationError } from '~~/server/errors/application-error'
import { invalidateRoutingRuntimeCache } from '~~/server/services/routing-runtime-service'
import type {
  RoutingRevisionPayload,
  RoutingRevisionRoute,
  RoutingRevisionUpstream
} from '~~/server/types/routing-revision'
import { canonicalJson } from '~~/server/utils/canonical-json'
import { getSqlState } from '~~/server/utils/database-error'
import { findRoutingRouteConflict, type RoutingConflictScope } from '~~/server/utils/routing-conflict'
import { firstRow } from '~~/server/utils/row'

function revisionChecksum(payload: RoutingRevisionPayload): string {
  return createHash('sha256').update(canonicalJson(payload)).digest('hex')
}

function validatePublishedRouteConflicts(scopes: RoutingConflictScope[]) {
  const conflict = findRoutingRouteConflict(scopes)
  if (conflict) {
    throw createApplicationError({
      statusCode: 409,
      message: 'routing revisions contain conflicting environment, host, method, and path shapes',
      data: { code: 'REVISION_ROUTE_CONFLICT', ...conflict }
    })
  }
}

export const routingRevisionService = {
  async list(environmentId?: string) {
    const query = db.select().from(routingRevisions)
    return (environmentId ? query.where(eq(routingRevisions.environmentId, environmentId)) : query)
      .orderBy(desc(routingRevisions.createdAt))
  },

  async publish(environmentId: string, createdBy: number | null) {
    try {
      const revision = await db.transaction(async (tx) => {
        const environment = firstRow(await tx.select().from(environments)
          .where(and(eq(environments.id, environmentId), eq(environments.status, 'active')))
          .limit(1))
        if (!environment) {
          throw createApplicationError({ statusCode: 404, message: 'environment not found', data: { code: 'ENVIRONMENT_NOT_FOUND' } })
        }

        const routeRows = await tx.select({
          id: apiRoutes.id,
          productId: apiProducts.id,
          productSlug: apiProducts.slug,
          versionId: apiVersions.id,
          version: apiVersions.version,
          name: apiRoutes.name,
          hosts: apiRoutes.hosts,
          method: apiRoutes.method,
          pathPattern: apiRoutes.pathPattern,
          normalizedShape: apiRoutes.normalizedShape,
          upstreamServiceId: apiRoutes.upstreamServiceId,
          upstreamPathTemplate: apiRoutes.upstreamPathTemplate,
          isApiKey: apiRoutes.isApiKey,
          isStatistics: apiRoutes.isStatistics,
          creditsCost: apiRoutes.creditsCost,
          rateLimitPerSecond: apiRoutes.rateLimitPerSecond,
          rateLimitPerMinute: apiRoutes.rateLimitPerMinute,
          rateLimitPerHour: apiRoutes.rateLimitPerHour,
          rateLimitPerDay: apiRoutes.rateLimitPerDay,
          timeoutMs: apiRoutes.timeoutMs,
          maxRequestBytes: apiRoutes.maxRequestBytes,
          maxResponseBytes: apiRoutes.maxResponseBytes,
          upstreamKind: upstreamServices.kind,
          loadBalancing: upstreamServices.loadBalancing
        }).from(apiRoutes)
          .innerJoin(apiVersions, eq(apiVersions.id, apiRoutes.apiVersionId))
          .innerJoin(apiProducts, eq(apiProducts.id, apiVersions.productId))
          .innerJoin(upstreamServices, eq(upstreamServices.id, apiRoutes.upstreamServiceId))
          .where(and(
            eq(apiProducts.workspaceId, environment.workspaceId),
            eq(apiProducts.lifecycle, 'active'),
            inArray(apiVersions.state, ['published', 'deprecated']),
            eq(apiRoutes.state, 'active'),
            eq(upstreamServices.status, 'active'),
            isNull(apiProducts.deletedAt),
            isNull(apiRoutes.deletedAt),
            isNull(upstreamServices.deletedAt)
          ))

        const routes: RoutingRevisionRoute[] = routeRows.map(route => ({
          id: route.id,
          productId: route.productId,
          productSlug: route.productSlug,
          versionId: route.versionId,
          version: route.version,
          name: route.name,
          hosts: [...route.hosts].sort(),
          method: route.method,
          pathPattern: route.pathPattern,
          normalizedShape: route.normalizedShape,
          upstreamServiceId: route.upstreamServiceId,
          upstreamPathTemplate: route.upstreamPathTemplate,
          isApiKey: route.isApiKey,
          isStatistics: route.isStatistics,
          creditsCost: route.creditsCost,
          rateLimitPerSecond: route.rateLimitPerSecond,
          rateLimitPerMinute: route.rateLimitPerMinute,
          rateLimitPerHour: route.rateLimitPerHour,
          rateLimitPerDay: route.rateLimitPerDay,
          timeoutMs: route.timeoutMs,
          maxRequestBytes: route.maxRequestBytes,
          maxResponseBytes: route.maxResponseBytes
        })).sort((left, right) => (
          left.pathPattern.localeCompare(right.pathPattern)
          || left.method.localeCompare(right.method)
          || left.id.localeCompare(right.id)
        ))

        const activeRevisionRows = await tx.select({
          environmentId: environments.id,
          defaultDomain: environments.defaultDomain,
          payload: routingRevisions.configPayload
        }).from(environments)
          .innerJoin(routingRevisions, eq(routingRevisions.id, environments.activeRevisionId))
          .where(and(eq(environments.status, 'active'), eq(routingRevisions.status, 'published')))
        validatePublishedRouteConflicts([
          {
            environmentId: environment.id,
            defaultDomain: environment.defaultDomain,
            routes
          },
          ...activeRevisionRows
            .filter(row => row.environmentId !== environment.id)
            .map(row => ({
              environmentId: row.environmentId,
              defaultDomain: row.defaultDomain,
              routes: row.payload.routes
            }))
        ])

        const upstreamDefinitions = new Map(routeRows.map(route => [route.upstreamServiceId, {
          id: route.upstreamServiceId,
          kind: route.upstreamKind as RoutingRevisionUpstream['kind'],
          loadBalancing: route.loadBalancing as RoutingRevisionUpstream['loadBalancing']
        }]))
        const upstreamIds = Array.from(upstreamDefinitions.keys()).sort()
        const targetRows = upstreamIds.length > 0
          ? await tx.select().from(upstreamTargets).where(and(
              inArray(upstreamTargets.upstreamServiceId, upstreamIds),
              eq(upstreamTargets.enabled, true)
            ))
          : []

        const upstreams: RoutingRevisionUpstream[] = upstreamIds.map((id) => {
          const definition = upstreamDefinitions.get(id)!
          const targets = targetRows
            .filter(target => target.upstreamServiceId === id)
            .map(target => ({ id: target.id, baseUrl: target.baseUrl, weight: target.weight }))
            .sort((left, right) => left.id.localeCompare(right.id))
          if (targets.length === 0) {
            throw createApplicationError({
              statusCode: 409,
              message: 'active route references an upstream without enabled targets',
              data: { code: 'UPSTREAM_HAS_NO_TARGETS', upstreamServiceId: id }
            })
          }
          return { ...definition, targets }
        })

        const sequenceRow = firstRow(await tx.select({ value: max(routingRevisions.sequence) })
          .from(routingRevisions)
          .where(eq(routingRevisions.environmentId, environment.id)))
        const sequence = Number(sequenceRow?.value ?? 0) + 1
        const revisionId = randomUUID()
        const generatedAt = new Date()
        const payload: RoutingRevisionPayload = {
          schemaVersion: 1,
          revisionId,
          environmentId: environment.id,
          generatedAt: generatedAt.toISOString(),
          routes,
          upstreams
        }

        if (environment.activeRevisionId) {
          await tx.update(routingRevisions)
            .set({ status: 'superseded' })
            .where(eq(routingRevisions.id, environment.activeRevisionId))
        }

        const created = firstRow(await tx.insert(routingRevisions).values({
          id: revisionId,
          workspaceId: environment.workspaceId,
          environmentId: environment.id,
          sequence,
          status: 'published',
          configPayload: payload,
          checksum: revisionChecksum(payload),
          createdBy,
          publishedAt: generatedAt
        }).returning())
        if (!created) throw new Error('revision insert returned no row')

        await tx.update(environments)
          .set({ activeRevisionId: created.id, updatedAt: generatedAt })
          .where(eq(environments.id, environment.id))

        return created
      })
      invalidateRoutingRuntimeCache()
      return revision
    } catch (error) {
      if (getSqlState(error) === '23505') {
        throw createApplicationError({
          statusCode: 409,
          message: 'routing revision publication conflicted with another publisher; retry the operation',
          data: { code: 'REVISION_PUBLISH_CONFLICT' }
        })
      }
      throw error
    }
  },

  async activate(environmentId: string, revisionId: string) {
    const revision = await db.transaction(async (tx) => {
      const environment = firstRow(await tx.select().from(environments)
        .where(eq(environments.id, environmentId))
        .limit(1))
      if (!environment) {
        throw createApplicationError({ statusCode: 404, message: 'environment not found', data: { code: 'ENVIRONMENT_NOT_FOUND' } })
      }

      const target = firstRow(await tx.select().from(routingRevisions).where(and(
        eq(routingRevisions.id, revisionId),
        eq(routingRevisions.environmentId, environmentId)
      )).limit(1))
      if (!target || (target.status !== 'published' && target.status !== 'superseded')) {
        throw createApplicationError({ statusCode: 404, message: 'published routing revision not found', data: { code: 'REVISION_NOT_FOUND' } })
      }

      const activeRevisionRows = await tx.select({
        environmentId: environments.id,
        defaultDomain: environments.defaultDomain,
        payload: routingRevisions.configPayload
      }).from(environments)
        .innerJoin(routingRevisions, eq(routingRevisions.id, environments.activeRevisionId))
        .where(and(eq(environments.status, 'active'), eq(routingRevisions.status, 'published')))
      validatePublishedRouteConflicts([
        {
          environmentId: environment.id,
          defaultDomain: environment.defaultDomain,
          routes: target.configPayload.routes
        },
        ...activeRevisionRows
          .filter(row => row.environmentId !== environment.id)
          .map(row => ({
            environmentId: row.environmentId,
            defaultDomain: row.defaultDomain,
            routes: row.payload.routes
          }))
      ])

      if (environment.activeRevisionId && environment.activeRevisionId !== target.id) {
        await tx.update(routingRevisions).set({ status: 'superseded' })
          .where(eq(routingRevisions.id, environment.activeRevisionId))
      }
      const activated = firstRow(await tx.update(routingRevisions).set({ status: 'published' })
        .where(eq(routingRevisions.id, target.id))
        .returning())
      if (!activated) throw new Error('routing revision activation returned no row')
      await tx.update(environments).set({ activeRevisionId: target.id, updatedAt: new Date() })
        .where(eq(environments.id, environment.id))
      return activated
    })
    invalidateRoutingRuntimeCache()
    return revision
  }
}
