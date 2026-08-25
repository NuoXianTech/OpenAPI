import { and, asc, count, eq, isNull, ne } from 'drizzle-orm'
import { db, type DatabaseTransaction } from '~~/server/db/client'
import {
  upstreamServiceConnections,
  upstreamServices,
  upstreamTargets,
  apiRoutes
} from '~~/server/db/schema'
import { createApplicationError } from '~~/server/errors/application-error'
import { toServiceConnectionView } from '~~/server/services/platform-service-control-context'
import { resolveServiceAvailability } from '~~/server/services/service-availability-service'
import { getSqlState } from '~~/server/utils/database-error'
import { firstRow } from '~~/server/utils/row'
import { encryptStoredSecret } from '~~/server/utils/stored-secret'
import { upstreamServiceTokenService } from '~~/server/services/upstream-service-token-service'
import { routingReferenceService } from '~~/server/services/routing-reference-service'
import { isServiceTargetReady } from '~~/server/utils/service-upstream-readiness'
import { applyPlatformMutation } from '~~/server/services/platform-endpoint-publication-service'
import type { UpstreamView } from '~~/server/types/platform-publication'
import { normalizeUpstreamTargetUrl } from '~~/server/utils/upstream-target-url'

interface CreateUpstreamInput {
  slug: string
  name: string
  loadBalancing: 'round_robin' | 'weighted'
  serviceToken?: string
  targets: Array<{
    baseUrl: string
    weight: number
  }>
}

interface UpdateUpstreamInput {
  slug?: string
  name?: string
  loadBalancing?: 'round_robin' | 'weighted'
  status?: 'active' | 'disabled'
}

interface CreateTargetInput {
  baseUrl: string
  weight: number
  enabled: boolean
}

interface UpdateTargetInput {
  baseUrl?: string
  weight?: number
  enabled?: boolean
}

function normalizeServiceToken(value: string | undefined): string {
  const token = value?.trim() ?? ''
  if (token.length < 32 || token.length > 4096) {
    throw createApplicationError({
      statusCode: 400,
      message: 'Service-managed upstreams require a Service Token with 32 to 4096 characters',
      data: { code: 'SERVICE_TOKEN_REQUIRED' }
    })
  }
  return token
}

async function findTargetBindingForUpdate(
  tx: DatabaseTransaction,
  id: string
) {
  return firstRow(await tx.select({
    target: upstreamTargets,
    service: upstreamServices
  }).from(upstreamTargets)
    .innerJoin(upstreamServices, eq(upstreamServices.id, upstreamTargets.upstreamServiceId))
    .where(and(eq(upstreamTargets.id, id), isNull(upstreamServices.deletedAt)))
    .limit(1)
    .for('update'))
}

async function assertCanDisableLastTarget(
  tx: DatabaseTransaction,
  serviceId: string,
  excludingTargetId?: string
): Promise<void> {
  const activeRoutes = firstRow(await tx.select({ value: count() })
    .from(apiRoutes)
    .where(and(
      eq(apiRoutes.upstreamServiceId, serviceId),
      eq(apiRoutes.state, 'active'),
      isNull(apiRoutes.deletedAt)
    )))
  if (Number(activeRoutes?.value ?? 0) === 0) return

  const enabledTargets = await tx.select()
    .from(upstreamTargets)
    .where(and(
      eq(upstreamTargets.upstreamServiceId, serviceId),
      eq(upstreamTargets.enabled, true),
      excludingTargetId ? ne(upstreamTargets.id, excludingTargetId) : undefined
    ))
  const connection = firstRow(await tx.select()
    .from(upstreamServiceConnections)
    .where(eq(upstreamServiceConnections.upstreamServiceId, serviceId))
    .limit(1)) ?? null
  if (connection && enabledTargets.some(target => isServiceTargetReady(target, connection))) return
  if (!connection && enabledTargets.length > 0) return

  throw createApplicationError({
    statusCode: 409,
    message: 'an active upstream route requires at least one ready target',
    data: { code: 'UPSTREAM_LAST_TARGET_REQUIRED' }
  })
}

export const platformUpstreamService = {
  async hasServiceConnection(
    id: string,
    options: { transaction?: DatabaseTransaction } = {}
  ): Promise<boolean> {
    const executor = options.transaction ?? db
    return Boolean(firstRow(await executor.select({ id: upstreamServiceConnections.upstreamServiceId })
      .from(upstreamServiceConnections)
      .where(eq(upstreamServiceConnections.upstreamServiceId, id))
      .limit(1)))
  },
  async list(
    options: { checkAvailability?: boolean } = {}
  ): Promise<UpstreamView[]> {
    const rows = await db.select({
      service: upstreamServices,
      target: upstreamTargets,
      connection: upstreamServiceConnections
    })
      .from(upstreamServices)
      .leftJoin(upstreamTargets, eq(upstreamTargets.upstreamServiceId, upstreamServices.id))
      .leftJoin(upstreamServiceConnections, eq(
        upstreamServiceConnections.upstreamServiceId,
        upstreamServices.id
      ))
      .where(isNull(upstreamServices.deletedAt))
      .orderBy(asc(upstreamServices.name), asc(upstreamTargets.createdAt))

    const result = new Map<string, typeof upstreamServices.$inferSelect & {
      serviceManaged: boolean
      targets: Array<typeof upstreamTargets.$inferSelect>
      connectionRecord: typeof upstreamServiceConnections.$inferSelect | null
    }>()
    for (const row of rows) {
      const item = result.get(row.service.id) ?? {
        ...row.service,
        serviceManaged: Boolean(row.connection),
        targets: [],
        connectionRecord: row.connection
      }
      if (row.target) item.targets.push(row.target)
      result.set(row.service.id, item)
    }
    return Promise.all(Array.from(result.values()).map(async (item) => {
      const { connectionRecord, ...upstream } = item
      const availability = options.checkAvailability !== true
        || upstream.status !== 'active'
        ? 'unknown'
        : (await resolveServiceAvailability(
            connectionRecord?.serviceDescription ?? null,
            upstream.targets,
            connectionRecord
              ? await upstreamServiceTokenService.get(upstream.id)
              : null
          )).overall
      return {
        ...upstream,
        connection: connectionRecord
          ? toServiceConnectionView(connectionRecord, availability)
          : null
      }
    }))
  },

  async create(input: CreateUpstreamInput) {
    const serviceToken = input.serviceToken
      ? normalizeServiceToken(input.serviceToken)
      : null
    const normalizedTargets = input.targets.map(target => ({
      ...target,
      url: normalizeUpstreamTargetUrl(target.baseUrl)
    }))
    try {
      return await db.transaction(async (tx) => {
        const service = firstRow(await tx.insert(upstreamServices).values({
          slug: input.slug,
          name: input.name,
          loadBalancing: input.loadBalancing
        }).returning())
        if (!service) throw new Error('upstream insert returned no row')

        const targets = await tx.insert(upstreamTargets).values(normalizedTargets.map(target => ({
          upstreamServiceId: service.id,
          baseUrl: target.url.toString(),
          weight: target.weight
        }))).returning()
        const connection = serviceToken
          ? firstRow(await tx.insert(upstreamServiceConnections).values({
              upstreamServiceId: service.id,
              serviceTokenCiphertext: encryptStoredSecret(
                serviceToken!,
                'service-token'
              )
            }).returning())
          : null
        return {
          ...service,
          serviceManaged: Boolean(connection),
          targets,
          connection: connection
            ? toServiceConnectionView(connection)
            : null
        }
      })
    } catch (error) {
      if (getSqlState(error) === '23505') {
        throw createApplicationError({ statusCode: 409, message: 'upstream slug or target already exists', data: { code: 'UPSTREAM_CONFLICT' } })
      }
      throw error
    }
  },

  async findById(
    id: string,
    options: { transaction?: DatabaseTransaction } = {}
  ) {
    const executor = options.transaction ?? db
    return firstRow(await executor.select().from(upstreamServices)
      .where(eq(upstreamServices.id, id))
      .limit(1))
  },

  async update(
    id: string,
    input: UpdateUpstreamInput,
    options: { transaction?: DatabaseTransaction } = {}
  ) {
    const executor = options.transaction ?? db
    try {
      const updated = firstRow(await executor.update(upstreamServices).set({
        ...input,
        updatedAt: new Date()
      }).where(and(eq(upstreamServices.id, id), isNull(upstreamServices.deletedAt))).returning())
      if (!updated) {
        throw createApplicationError({ statusCode: 404, message: 'upstream not found', data: { code: 'UPSTREAM_NOT_FOUND' } })
      }
      return {
        ...updated,
        serviceManaged: await platformUpstreamService.hasServiceConnection(
          id,
          { transaction: options.transaction }
        )
      }
    } catch (error) {
      if (getSqlState(error) === '23505') {
        throw createApplicationError({ statusCode: 409, message: 'upstream slug already exists', data: { code: 'UPSTREAM_CONFLICT' } })
      }
      throw error
    }
  },

  async remove(
    id: string,
    options: { transaction?: DatabaseTransaction } = {}
  ) {
    const executor = options.transaction ?? db
    const service = await platformUpstreamService.findById(id, options)
    if (!service || service.deletedAt) {
      throw createApplicationError({ statusCode: 404, message: 'upstream not found', data: { code: 'UPSTREAM_NOT_FOUND' } })
    }
    if (await routingReferenceService.hasUpstream(id, options.transaction)) {
      throw createApplicationError({
        statusCode: 409,
        message: 'upstream is still referenced by an active routing revision',
        data: { code: 'UPSTREAM_STILL_PUBLISHED' }
      })
    }
    const routeCount = firstRow(await executor.select({ value: count() }).from(apiRoutes)
      .where(and(eq(apiRoutes.upstreamServiceId, id), isNull(apiRoutes.deletedAt))))
    if (Number(routeCount?.value ?? 0) > 0) {
      throw createApplicationError({
        statusCode: 409,
        message: 'remove every route before deleting the upstream',
        data: { code: 'UPSTREAM_HAS_ROUTES' }
      })
    }
    const now = new Date()
    const removed = firstRow(await executor.update(upstreamServices).set({
      status: 'disabled',
      deletedAt: now,
      updatedAt: now
    }).where(and(eq(upstreamServices.id, id), isNull(upstreamServices.deletedAt))).returning())
    if (!removed) {
      throw createApplicationError({ statusCode: 404, message: 'upstream not found', data: { code: 'UPSTREAM_NOT_FOUND' } })
    }
    return removed
  },

  async createTarget(
    upstreamServiceId: string,
    input: CreateTargetInput,
    options: { transaction?: DatabaseTransaction } = {}
  ) {
    const executor = options.transaction ?? db
    const service = await platformUpstreamService.findById(
      upstreamServiceId,
      options
    )
    if (!service || service.deletedAt) {
      throw createApplicationError({ statusCode: 404, message: 'upstream not found', data: { code: 'UPSTREAM_NOT_FOUND' } })
    }
    const url = normalizeUpstreamTargetUrl(input.baseUrl)
    try {
      const serviceManaged = await platformUpstreamService.hasServiceConnection(
        upstreamServiceId,
        { transaction: options.transaction }
      )
      const target = firstRow(await executor.insert(upstreamTargets).values({
        upstreamServiceId,
        baseUrl: url.toString(),
        weight: input.weight,
        enabled: input.enabled
      }).returning())
      if (!target) throw new Error('target insert returned no row')
      return {
        target,
        publishRouting: !serviceManaged && target.enabled
      }
    } catch (error) {
      if (getSqlState(error) === '23505') {
        throw createApplicationError({ statusCode: 409, message: 'target URL already exists for this upstream', data: { code: 'TARGET_CONFLICT' } })
      }
      throw error
    }
  },

  async updateTarget(
    id: string,
    input: UpdateTargetInput,
    options: { transaction?: DatabaseTransaction } = {}
  ) {
    try {
      const update = async (tx: DatabaseTransaction) => {
        const binding = await findTargetBindingForUpdate(tx, id)
        if (!binding) {
          throw createApplicationError({ statusCode: 404, message: 'target not found', data: { code: 'TARGET_NOT_FOUND' } })
        }
        if (binding.target.enabled && input.enabled === false) {
          await assertCanDisableLastTarget(
            tx,
            binding.service.id,
            binding.target.id
          )
        }
        const baseUrl = input.baseUrl === undefined
          ? binding.target.baseUrl
          : normalizeUpstreamTargetUrl(input.baseUrl).toString()
        const serviceManaged = await platformUpstreamService.hasServiceConnection(
          binding.service.id,
          { transaction: tx }
        )
        const resetServiceState = serviceManaged
          && (
            baseUrl !== binding.target.baseUrl
            || (!binding.target.enabled && input.enabled === true)
          )
        const target = firstRow(await tx.update(upstreamTargets).set({
          ...input,
          baseUrl,
          ...(resetServiceState
            ? {
                configurationRevision: null,
                configurationHash: null,
                configurationStatus: 'unknown',
                configurationState: null,
                lastConfigurationSyncAt: null,
                lastError: null
              }
            : {}),
          updatedAt: new Date()
        }).where(eq(upstreamTargets.id, id)).returning())
        if (!target) throw new Error('target update returned no row')
        const disablingPublishedTarget = binding.target.enabled
          && target.enabled === false
        const updatingPublishedTarget = !resetServiceState
          && target.enabled
          && input.weight !== undefined
          && input.weight !== binding.target.weight
        return {
          target,
          publishRouting: !serviceManaged
            || disablingPublishedTarget
            || updatingPublishedTarget
        }
      }
      return options.transaction
        ? await update(options.transaction)
        : await db.transaction(update)
    } catch (error) {
      if (getSqlState(error) === '23505') {
        throw createApplicationError({ statusCode: 409, message: 'target URL already exists for this upstream', data: { code: 'TARGET_CONFLICT' } })
      }
      throw error
    }
  },

  async removeTarget(
    id: string,
    options: {
      transaction?: DatabaseTransaction
      allowActiveRoutingRemoval?: boolean
    } = {}
  ) {
    const remove = async (tx: DatabaseTransaction) => {
      const binding = await findTargetBindingForUpdate(tx, id)
      if (!binding) {
        throw createApplicationError({ statusCode: 404, message: 'target not found', data: { code: 'TARGET_NOT_FOUND' } })
      }
      const published = await routingReferenceService.hasTarget(id, tx)
      if (published && !options.allowActiveRoutingRemoval) {
        throw createApplicationError({
          statusCode: 409,
          message: 'disable the target and publish routing before deleting it',
          data: { code: 'TARGET_STILL_PUBLISHED' }
        })
      }
      if (binding.target.enabled || published) {
        await assertCanDisableLastTarget(
          tx,
          binding.service.id,
          binding.target.id
        )
      }
      await tx.delete(upstreamTargets).where(eq(upstreamTargets.id, id))
      return binding.target
    }
    return options.transaction
      ? remove(options.transaction)
      : db.transaction(remove)
  },

  async updateServiceToken(id: string, serviceToken: string) {
    const normalizedToken = normalizeServiceToken(serviceToken)
    const service = await platformUpstreamService.findById(id)
    if (!service || service.deletedAt) {
      throw createApplicationError({
        statusCode: 404,
        message: 'upstream not found',
        data: { code: 'UPSTREAM_NOT_FOUND' }
      })
    }
    const serviceTokenCiphertext = encryptStoredSecret(
      normalizedToken,
      'service-token'
    )
    const updated = firstRow(await db.insert(upstreamServiceConnections)
      .values({
        upstreamServiceId: id,
        serviceTokenCiphertext,
        lastDiscoveryError: 'Service Token changed; run discovery to verify the connection'
      })
      .onConflictDoUpdate({
        target: upstreamServiceConnections.upstreamServiceId,
        set: {
          serviceTokenCiphertext,
          lastDiscoveryError: 'Service Token changed; run discovery to verify the connection',
          updatedAt: new Date()
        }
      })
      .returning())
    if (!updated) {
      throw createApplicationError({
        statusCode: 404,
        message: 'upstream not found',
        data: { code: 'SERVICE_CONNECTION_NOT_FOUND' }
      })
    }
    return toServiceConnectionView(updated)
  },

  async updateAndPublish(
    id: string,
    input: UpdateUpstreamInput,
    createdBy: number | null
  ) {
    const committed = await applyPlatformMutation(createdBy, async tx => ({
      value: await platformUpstreamService.update(id, input, { transaction: tx })
    }))
    const { value: upstream, ...publication } = committed
    return { upstream, ...publication }
  },

  async removeAndPublish(id: string, createdBy: number | null) {
    const committed = await applyPlatformMutation(createdBy, async tx => ({
      value: await platformUpstreamService.remove(id, { transaction: tx })
    }))
    const { value: upstream, ...publication } = committed
    return { upstream, ...publication }
  },

  async createTargetAndPublish(
    upstreamServiceId: string,
    input: CreateTargetInput,
    createdBy: number | null
  ) {
    const committed = await applyPlatformMutation(createdBy, async (tx) => {
      const created = await platformUpstreamService.createTarget(
        upstreamServiceId,
        input,
        { transaction: tx }
      )
      return { value: created.target, publishRouting: created.publishRouting }
    })
    const { value: target, ...publication } = committed
    return { target, ...publication }
  },

  async updateTargetAndPublish(
    id: string,
    input: UpdateTargetInput,
    createdBy: number | null
  ) {
    const committed = await applyPlatformMutation(createdBy, async (tx) => {
      const updated = await platformUpstreamService.updateTarget(id, input, {
        transaction: tx
      })
      return { value: updated.target, publishRouting: updated.publishRouting }
    })
    const { value: target, ...publication } = committed
    return { target, ...publication }
  },

  async removeTargetAndPublish(id: string, createdBy: number | null) {
    const committed = await applyPlatformMutation(createdBy, async tx => ({
      value: await platformUpstreamService.removeTarget(id, {
        transaction: tx,
        allowActiveRoutingRemoval: true
      })
    }))
    const { value: target, ...publication } = committed
    return { target, ...publication }
  }
}
