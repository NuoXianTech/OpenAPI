import { createHash, randomUUID } from 'node:crypto'
import { and, desc, eq, inArray, isNull, max } from 'drizzle-orm'
import { db, type DatabaseTransaction } from '~~/server/db/client'
import {
  apiProducts,
  apiRoutes,
  apiVersions,
  platformRuntime,
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
  RoutingRevisionRoute,
  RoutingRevisionUpstream
} from '~~/server/types/routing-revision'
import { canonicalJson } from '~~/server/utils/canonical-json'
import { getSqlState } from '~~/server/utils/database-error'
import { findRoutingRouteConflict } from '~~/server/utils/routing-conflict'
import { firstRow } from '~~/server/utils/row'
import { isServiceTargetReady } from '~~/server/utils/service-upstream-readiness'
import { toRoutingRevisionRoute } from '~~/server/utils/routing-revision-route'

type RoutingRuntimeConfiguration = Pick<
  RoutingRevisionPayload,
  'schemaVersion' | 'routes' | 'upstreams'
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
    routes: current.routes,
    upstreams: current.upstreams
  }) === canonicalJson(desired)
}

function validatePublishedRouteConflicts(
  routes: RoutingRevisionRoute[],
  defaultDomain: string | null
) {
  const conflict = findRoutingRouteConflict(routes, defaultDomain)
  if (conflict) {
    throw createApplicationError({
      statusCode: 409,
      message: 'routing revision contains conflicting host, method, and path shapes',
      data: { code: 'REVISION_ROUTE_CONFLICT', ...conflict }
    })
  }
}

/**
 * 发布与激活都要读到同一行运行时并阻塞并发写者，让冲突校验和激活指针串行。
 */
export async function lockPlatformRuntime(tx: DatabaseTransaction) {
  const runtime = firstRow(await tx.select().from(platformRuntime)
    .where(eq(platformRuntime.id, 1))
    .limit(1)
    .for('update'))
  if (!runtime) throw new Error('platform runtime row is missing')
  return runtime
}

export async function invalidateRoutingPublicationCaches(): Promise<void> {
  invalidateRoutingRuntimeCache()
  await invalidatePublicApiCatalogCache()
}

export const routingRevisionService = {
  async list() {
    return db.select().from(routingRevisions).orderBy(desc(routingRevisions.createdAt))
  },

  async publish(
    createdBy: number | null,
    transaction?: { tx: DatabaseTransaction }
  ) {
    try {
      const publish = async (tx: DatabaseTransaction) => {
        // 重新读取运行时单行：同一事务里可能刚改过 defaultDomain，
        // 冲突校验必须看到最新值。已持有锁时这次读取不再阻塞。
        const runtime = await lockPlatformRuntime(tx)

        const routeRows = await tx.select({
          route: apiRoutes,
          product: apiProducts,
          version: apiVersions,
          serviceManaged: upstreamServiceConnections.upstreamServiceId,
          loadBalancing: upstreamServices.loadBalancing
        }).from(apiRoutes)
          .innerJoin(apiVersions, eq(apiVersions.id, apiRoutes.apiVersionId))
          .innerJoin(apiProducts, eq(apiProducts.id, apiVersions.productId))
          .innerJoin(upstreamServices, eq(upstreamServices.id, apiRoutes.upstreamServiceId))
          .leftJoin(upstreamServiceConnections, eq(
            upstreamServiceConnections.upstreamServiceId,
            upstreamServices.id
          ))
          .where(and(
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

        validatePublishedRouteConflicts(routes, runtime.defaultDomain)
        const activeRevision = runtime.activeRevisionId
          ? firstRow(await tx.select().from(routingRevisions)
              .where(eq(routingRevisions.id, runtime.activeRevisionId))
              .limit(1))
          : null
        const activeUpstreams = new Map(
          activeRevision?.configPayload.upstreams.map(upstream => [upstream.id, upstream])
          ?? []
        )

        const upstreamDefinitions = new Map(routeRows.map(row => [row.route.upstreamServiceId, {
          id: row.route.upstreamServiceId,
          serviceManaged: Boolean(row.serviceManaged),
          loadBalancing: row.loadBalancing as RoutingRevisionUpstream['loadBalancing']
        }]))
        const upstreamIds = Array.from(upstreamDefinitions.keys()).sort()
        const targetRows = upstreamIds.length > 0
          ? await tx.select().from(upstreamTargets).where(and(
              inArray(upstreamTargets.upstreamServiceId, upstreamIds),
              eq(upstreamTargets.enabled, true)
            ))
          : []
        const serviceManagedIds = upstreamIds.filter(id => (
          upstreamDefinitions.get(id)?.serviceManaged === true
        ))
        const connectionRows = serviceManagedIds.length > 0
          ? await tx.select().from(upstreamServiceConnections).where(inArray(
              upstreamServiceConnections.upstreamServiceId,
              serviceManagedIds
            ))
          : []
        const connections = new Map(connectionRows.map(connection => [
          connection.upstreamServiceId,
          connection
        ]))

        const upstreams: RoutingRevisionUpstream[] = upstreamIds.map((id) => {
          const definition = upstreamDefinitions.get(id)!
          let serviceManaged = definition.serviceManaged
          let targets = targetRows
            .filter(target => target.upstreamServiceId === id)
            .filter(target => !serviceManaged
              || isServiceTargetReady(target, connections.get(id) ?? null))
            .map(target => ({ id: target.id, baseUrl: target.baseUrl, weight: target.weight }))
            .sort((left, right) => left.id.localeCompare(right.id))
          if (serviceManaged && targets.length === 0) {
            const activeUpstream = activeUpstreams.get(id)
            if (activeUpstream) {
              // Keep the last active runtime while a newly managed Upstream
              // is waiting for its first verified Service Target. Once
              // discovery succeeds, the next publication switches the
              // runtime to Service authentication and verified Targets.
              serviceManaged = activeUpstream.serviceManaged
              targets = activeUpstream.targets.map(target => ({ ...target }))
            }
          }
          if (targets.length === 0) {
            throw createApplicationError({
              statusCode: 409,
              message: definition.serviceManaged
                ? 'active route references a Service-managed upstream without verified targets'
                : 'active route references an upstream without enabled targets',
              data: {
                code: definition.serviceManaged
                  ? 'SERVICE_UPSTREAM_NOT_READY'
                  : 'UPSTREAM_HAS_NO_TARGETS',
                upstreamServiceId: id
              }
            })
          }
          return { ...definition, serviceManaged, targets }
        })

        const desiredConfiguration: RoutingRuntimeConfiguration = {
          schemaVersion: 1,
          routes,
          upstreams
        }
        if (
          activeRevision
          && hasSameRuntimeConfiguration(
            activeRevision.configPayload,
            desiredConfiguration
          )
        ) return activeRevision

        const sequenceRow = firstRow(await tx.select({ value: max(routingRevisions.sequence) })
          .from(routingRevisions))
        const sequence = Number(sequenceRow?.value ?? 0) + 1
        const revisionId = randomUUID()
        const generatedAt = new Date()
        const payload: RoutingRevisionPayload = {
          ...desiredConfiguration,
          revisionId,
          generatedAt: generatedAt.toISOString()
        }

        const created = firstRow(await tx.insert(routingRevisions).values({
          id: revisionId,
          sequence,
          configPayload: payload,
          checksum: revisionChecksum(payload),
          createdBy,
          publishedAt: generatedAt
        }).returning())
        if (!created) throw new Error('revision insert returned no row')

        await tx.update(platformRuntime)
          .set({ activeRevisionId: created.id, updatedAt: generatedAt })
          .where(eq(platformRuntime.id, 1))

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

  async activate(revisionId: string) {
    const revision = await db.transaction(async (tx) => {
      const runtime = await lockPlatformRuntime(tx)

      const target = firstRow(await tx.select().from(routingRevisions)
        .where(eq(routingRevisions.id, revisionId))
        .limit(1))
      if (!target) {
        throw createApplicationError({ statusCode: 404, message: 'published routing revision not found', data: { code: 'REVISION_NOT_FOUND' } })
      }
      if (runtime.activeRevisionId === target.id) return target

      validatePublishedRouteConflicts(
        target.configPayload.routes,
        runtime.defaultDomain
      )
      await tx.update(platformRuntime)
        .set({ activeRevisionId: target.id, updatedAt: new Date() })
        .where(eq(platformRuntime.id, 1))
      return target
    })
    await invalidateRoutingPublicationCaches()
    return revision
  }
}
