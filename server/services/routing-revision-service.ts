import { createHash, randomUUID } from 'node:crypto'
import { and, asc, desc, eq, inArray, isNull, max } from 'drizzle-orm'
import { db, type DatabaseTransaction } from '~~/server/db/client'
import {
  apiProducts,
  apiRoutes,
  apiVersions,
  environments,
  routingRevisions,
  upstreamServiceConnections,
  upstreamServices,
  upstreamTargets
} from '~~/server/db/schema'
import { createApplicationError } from '~~/server/errors/application-error'
import { invalidatePublicApiCatalogCache } from '~~/server/services/api-catalog-service'
import { invalidateRoutingRuntimeCache } from '~~/server/services/routing-runtime-service'
import type {
  RoutingRevisionPayload,
  RoutingRevisionUpstream
} from '~~/server/types/routing-revision'
import { canonicalJson } from '~~/server/utils/canonical-json'
import { getSqlState } from '~~/server/utils/database-error'
import { findRoutingRouteConflict, type RoutingConflictScope } from '~~/server/utils/routing-conflict'
import { firstRow } from '~~/server/utils/row'
import { isInternalTargetReady } from '~~/server/utils/internal-upstream-readiness'
import { toRoutingRevisionRoute } from '~~/server/utils/routing-revision-route'

type RoutingRuntimeConfiguration = Pick<
  RoutingRevisionPayload,
  'schemaVersion' | 'environmentId' | 'routes' | 'upstreams'
>

function revisionChecksum(payload: RoutingRevisionPayload): string {
  return createHash('sha256').update(canonicalJson(payload)).digest('hex')
}

function hasSameRuntimeConfiguration(
  current: RoutingRevisionPayload,
  desired: RoutingRuntimeConfiguration
): boolean {
  return canonicalJson({
    schemaVersion: current.schemaVersion,
    environmentId: current.environmentId,
    routes: current.routes,
    upstreams: current.upstreams
  }) === canonicalJson(desired)
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

export async function invalidateRoutingPublicationCaches(): Promise<void> {
  invalidateRoutingRuntimeCache()
  await invalidatePublicApiCatalogCache()
}

export const routingRevisionService = {
  async list(environmentId?: string) {
    const query = db.select().from(routingRevisions)
    return (environmentId ? query.where(eq(routingRevisions.environmentId, environmentId)) : query)
      .orderBy(desc(routingRevisions.createdAt))
  },

  async publish(
    environmentId: string,
    createdBy: number | null,
    transaction?: {
      tx: DatabaseTransaction
      activeEnvironments: Array<typeof environments.$inferSelect>
    }
  ) {
    try {
      const publish = async (tx: DatabaseTransaction) => {
        // Every publisher locks the same ordered set before reading active
        // snapshots. This serializes conflict validation and active-revision
        // pointer updates across environments.
        const activeEnvironments = transaction?.activeEnvironments
          ?? await tx.select().from(environments)
            .where(eq(environments.status, 'active'))
            .orderBy(asc(environments.id))
            .for('update')
        const environment = activeEnvironments.find(item => item.id === environmentId)
        if (!environment) {
          throw createApplicationError({ statusCode: 404, message: 'environment not found', data: { code: 'ENVIRONMENT_NOT_FOUND' } })
        }

        const routeRows = await tx.select({
          route: apiRoutes,
          product: apiProducts,
          version: apiVersions,
          upstreamKind: upstreamServices.kind,
          loadBalancing: upstreamServices.loadBalancing
        }).from(apiRoutes)
          .innerJoin(apiVersions, eq(apiVersions.id, apiRoutes.apiVersionId))
          .innerJoin(apiProducts, eq(apiProducts.id, apiVersions.productId))
          .innerJoin(upstreamServices, eq(upstreamServices.id, apiRoutes.upstreamServiceId))
          .where(and(
            eq(apiProducts.workspaceId, environment.workspaceId),
            inArray(apiProducts.lifecycle, ['active', 'deprecated']),
            inArray(apiVersions.state, ['published', 'deprecated']),
            eq(apiRoutes.state, 'active'),
            eq(upstreamServices.status, 'active'),
            isNull(apiProducts.deletedAt),
            isNull(apiRoutes.deletedAt),
            isNull(upstreamServices.deletedAt)
          ))

        const routes = routeRows.map(toRoutingRevisionRoute).sort((left, right) => (
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
          .where(eq(environments.status, 'active'))
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
        const activePayload = activeRevisionRows.find(row => (
          row.environmentId === environment.id
        ))?.payload
        const activeUpstreams = new Map(
          activePayload?.upstreams.map(upstream => [upstream.id, upstream])
          ?? []
        )

        const upstreamDefinitions = new Map(routeRows.map(row => [row.route.upstreamServiceId, {
          id: row.route.upstreamServiceId,
          kind: row.upstreamKind as RoutingRevisionUpstream['kind'],
          loadBalancing: row.loadBalancing as RoutingRevisionUpstream['loadBalancing']
        }]))
        const upstreamIds = Array.from(upstreamDefinitions.keys()).sort()
        const targetRows = upstreamIds.length > 0
          ? await tx.select().from(upstreamTargets).where(and(
              inArray(upstreamTargets.upstreamServiceId, upstreamIds),
              eq(upstreamTargets.enabled, true)
            ))
          : []
        const internalUpstreamIds = upstreamIds.filter(id => (
          upstreamDefinitions.get(id)?.kind === 'internal'
        ))
        const connectionRows = internalUpstreamIds.length > 0
          ? await tx.select().from(upstreamServiceConnections).where(inArray(
              upstreamServiceConnections.upstreamServiceId,
              internalUpstreamIds
            ))
          : []
        const connections = new Map(connectionRows.map(connection => [
          connection.upstreamServiceId,
          connection
        ]))

        const upstreams: RoutingRevisionUpstream[] = upstreamIds.map((id) => {
          const definition = upstreamDefinitions.get(id)!
          let targets = targetRows
            .filter(target => target.upstreamServiceId === id)
            .filter(target => definition.kind !== 'internal'
              || isInternalTargetReady(target, connections.get(id) ?? null))
            .map(target => ({ id: target.id, baseUrl: target.baseUrl, weight: target.weight }))
            .sort((left, right) => left.id.localeCompare(right.id))
          if (definition.kind === 'internal' && targets.length === 0) {
            const activeUpstream = activeUpstreams.get(id)
            if (activeUpstream?.kind === 'internal') {
              // Keep this Upstream's last verified Targets so an unrelated
              // Service can publish without disrupting existing traffic.
              targets = activeUpstream.targets.map(target => ({ ...target }))
            }
          }
          if (targets.length === 0) {
            throw createApplicationError({
              statusCode: 409,
              message: definition.kind === 'internal'
                ? 'active route references an internal upstream without verified targets'
                : 'active route references an upstream without enabled targets',
              data: {
                code: definition.kind === 'internal'
                  ? 'INTERNAL_UPSTREAM_NOT_READY'
                  : 'UPSTREAM_HAS_NO_TARGETS',
                upstreamServiceId: id
              }
            })
          }
          return { ...definition, targets }
        })

        const desiredConfiguration: RoutingRuntimeConfiguration = {
          schemaVersion: 1,
          environmentId: environment.id,
          routes,
          upstreams
        }
        if (environment.activeRevisionId) {
          const activeRevision = firstRow(await tx.select()
            .from(routingRevisions)
            .where(eq(routingRevisions.id, environment.activeRevisionId))
            .limit(1))
          if (
            activeRevision
            && hasSameRuntimeConfiguration(
              activeRevision.configPayload,
              desiredConfiguration
            )
          ) return activeRevision
        }

        const sequenceRow = firstRow(await tx.select({ value: max(routingRevisions.sequence) })
          .from(routingRevisions)
          .where(eq(routingRevisions.environmentId, environment.id)))
        const sequence = Number(sequenceRow?.value ?? 0) + 1
        const revisionId = randomUUID()
        const generatedAt = new Date()
        const payload: RoutingRevisionPayload = {
          ...desiredConfiguration,
          revisionId,
          generatedAt: generatedAt.toISOString(),
        }

        const created = firstRow(await tx.insert(routingRevisions).values({
          id: revisionId,
          workspaceId: environment.workspaceId,
          environmentId: environment.id,
          sequence,
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
      }
      const revision = transaction
        ? await publish(transaction.tx)
        : await db.transaction(publish)
      if (!transaction) await invalidateRoutingPublicationCaches()
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
      const activeEnvironments = await tx.select().from(environments)
        .where(eq(environments.status, 'active'))
        .orderBy(asc(environments.id))
        .for('update')
      const environment = activeEnvironments.find(item => item.id === environmentId)
      if (!environment) {
        throw createApplicationError({ statusCode: 404, message: 'environment not found', data: { code: 'ENVIRONMENT_NOT_FOUND' } })
      }

      const target = firstRow(await tx.select().from(routingRevisions).where(and(
        eq(routingRevisions.id, revisionId),
        eq(routingRevisions.environmentId, environmentId)
      )).limit(1))
      if (!target) {
        throw createApplicationError({ statusCode: 404, message: 'published routing revision not found', data: { code: 'REVISION_NOT_FOUND' } })
      }

      const activeRevisionRows = await tx.select({
        environmentId: environments.id,
        defaultDomain: environments.defaultDomain,
        payload: routingRevisions.configPayload
      }).from(environments)
        .innerJoin(routingRevisions, eq(routingRevisions.id, environments.activeRevisionId))
        .where(eq(environments.status, 'active'))
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

      if (environment.activeRevisionId === target.id) return target
      await tx.update(environments).set({ activeRevisionId: target.id, updatedAt: new Date() })
        .where(eq(environments.id, environment.id))
      return target
    })
    await invalidateRoutingPublicationCaches()
    return revision
  },

  async publishWorkspace(
    workspaceId: string,
    createdBy: number | null,
    transaction?: {
      tx: DatabaseTransaction
      activeEnvironments?: Array<typeof environments.$inferSelect>
    }
  ) {
    const publish = async (tx: DatabaseTransaction) => {
      const activeEnvironments = transaction?.activeEnvironments
        ?? await tx.select().from(environments)
          .where(eq(environments.status, 'active'))
          .orderBy(asc(environments.id))
          .for('update')
      const workspaceEnvironments = activeEnvironments.filter(
        environment => environment.workspaceId === workspaceId
      )
      const published = []
      for (const environment of workspaceEnvironments) {
        published.push(await routingRevisionService.publish(
          environment.id,
          createdBy,
          { tx, activeEnvironments }
        ))
      }
      return published
    }
    const revisions = transaction
      ? await publish(transaction.tx)
      : await db.transaction(publish)
    if (!transaction) await invalidateRoutingPublicationCaches()
    return revisions
  }
}
