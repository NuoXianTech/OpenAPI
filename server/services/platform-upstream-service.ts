import { isIP } from 'node:net'
import { and, asc, count, eq, isNull, ne } from 'drizzle-orm'
import { ipInAnyCidr } from '#shared/utils/cidr'
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
import {
  invalidateUpstreamServiceToken,
  upstreamServiceTokenService
} from '~~/server/services/upstream-service-token-service'
import { routingReferenceService } from '~~/server/services/routing-reference-service'
import { isInternalTargetReady } from '~~/server/utils/internal-upstream-readiness'
import { applyWorkspaceMutation } from '~~/server/services/platform-endpoint-publication-service'
import type { UpstreamView } from '~~/server/types/platform-publication'

const BLOCKED_EXTERNAL_IPS = [
  '0.0.0.0/8',
  '10.0.0.0/8',
  '100.64.0.0/10',
  '127.0.0.0/8',
  '169.254.0.0/16',
  '172.16.0.0/12',
  '192.168.0.0/16',
  '::/128',
  '::1/128',
  'fc00::/7',
  'fe80::/10'
] as const

interface CreateUpstreamInput {
  workspaceId: string
  slug: string
  name: string
  kind: 'internal' | 'external'
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

function normalizeTargetUrl(value: string, kind: CreateUpstreamInput['kind']): URL {
  const url = new URL(value)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw createApplicationError({ statusCode: 400, message: 'upstream target must use HTTP or HTTPS', data: { code: 'UPSTREAM_PROTOCOL_INVALID' } })
  }
  if (url.username || url.password || url.search || url.hash) {
    throw createApplicationError({ statusCode: 400, message: 'upstream target must not contain credentials, query, or fragment', data: { code: 'UPSTREAM_URL_INVALID' } })
  }
  if (kind === 'external') {
    const hostname = url.hostname
      .toLowerCase()
      .replace(/^\[|\]$/g, '')
      .replace(/\.$/, '')
    if (url.protocol !== 'https:') {
      throw createApplicationError({ statusCode: 400, message: 'external upstream must use HTTPS', data: { code: 'EXTERNAL_UPSTREAM_REQUIRES_HTTPS' } })
    }
    if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
      throw createApplicationError({ statusCode: 400, message: 'external upstream hostname is blocked', data: { code: 'EXTERNAL_UPSTREAM_HOST_BLOCKED' } })
    }
    if (isIP(hostname) && ipInAnyCidr(hostname, BLOCKED_EXTERNAL_IPS)) {
      throw createApplicationError({ statusCode: 400, message: 'external upstream address is blocked', data: { code: 'EXTERNAL_UPSTREAM_ADDRESS_BLOCKED' } })
    }
  }

  url.pathname = url.pathname === '/' ? '' : url.pathname.replace(/\/$/, '')
  return url
}

function normalizeServiceToken(value: string | undefined): string {
  const token = value?.trim() ?? ''
  if (token.length < 32 || token.length > 4096) {
    throw createApplicationError({
      statusCode: 400,
      message: 'internal upstream requires a Service Token with 32 to 4096 characters',
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
  serviceKind: CreateUpstreamInput['kind'],
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
  if (serviceKind === 'external' && enabledTargets.length > 0) return
  if (serviceKind === 'internal') {
    const connection = firstRow(await tx.select()
      .from(upstreamServiceConnections)
      .where(eq(upstreamServiceConnections.upstreamServiceId, serviceId))
      .limit(1)) ?? null
    if (enabledTargets.some(target => isInternalTargetReady(
      target,
      connection
    ))) return
  }

  throw createApplicationError({
    statusCode: 409,
    message: 'an active upstream route requires at least one ready target',
    data: { code: 'UPSTREAM_LAST_TARGET_REQUIRED' }
  })
}

export const platformUpstreamService = {
  async list(
    workspaceId?: string,
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
      .where(and(
        isNull(upstreamServices.deletedAt),
        workspaceId ? eq(upstreamServices.workspaceId, workspaceId) : undefined
      ))
      .orderBy(asc(upstreamServices.name), asc(upstreamTargets.createdAt))

    const result = new Map<string, typeof upstreamServices.$inferSelect & {
      targets: Array<typeof upstreamTargets.$inferSelect>
      connectionRecord: typeof upstreamServiceConnections.$inferSelect | null
    }>()
    for (const row of rows) {
      const item = result.get(row.service.id) ?? {
        ...row.service,
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
    const serviceToken = input.kind === 'internal'
      ? normalizeServiceToken(input.serviceToken)
      : null
    const normalizedTargets = input.targets.map(target => ({
      ...target,
      url: normalizeTargetUrl(target.baseUrl, input.kind)
    }))
    const protocols = new Set(normalizedTargets.map(target => target.url.protocol.slice(0, -1)))
    if (protocols.size !== 1) {
      throw createApplicationError({
        statusCode: 400,
        message: 'all upstream targets must use the same protocol',
        data: { code: 'UPSTREAM_PROTOCOL_MISMATCH' }
      })
    }

    try {
      return await db.transaction(async (tx) => {
        const service = firstRow(await tx.insert(upstreamServices).values({
          workspaceId: input.workspaceId,
          slug: input.slug,
          name: input.name,
          kind: input.kind,
          protocol: Array.from(protocols)[0] as 'http' | 'https',
          loadBalancing: input.loadBalancing
        }).returning())
        if (!service) throw new Error('upstream insert returned no row')

        const targets = await tx.insert(upstreamTargets).values(normalizedTargets.map(target => ({
          upstreamServiceId: service.id,
          baseUrl: target.url.toString(),
          weight: target.weight
        }))).returning()
        const connection = input.kind === 'internal'
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
      if (getSqlState(error) === '23503') {
        throw createApplicationError({ statusCode: 404, message: 'workspace not found', data: { code: 'WORKSPACE_NOT_FOUND' } })
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
      return updated
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
    invalidateUpstreamServiceToken(id)
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
    const url = normalizeTargetUrl(input.baseUrl, service.kind as CreateUpstreamInput['kind'])
    if (url.protocol.slice(0, -1) !== service.protocol) {
      throw createApplicationError({ statusCode: 400, message: 'target protocol must match its upstream', data: { code: 'UPSTREAM_PROTOCOL_MISMATCH' } })
    }
    try {
      const target = firstRow(await executor.insert(upstreamTargets).values({
        upstreamServiceId,
        baseUrl: url.toString(),
        weight: input.weight,
        enabled: input.enabled
      }).returning())
      if (!target) throw new Error('target insert returned no row')
      return {
        target,
        workspaceId: service.workspaceId,
        publishRouting: service.kind === 'external' && target.enabled
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
            binding.service.kind as CreateUpstreamInput['kind'],
            binding.target.id
          )
        }
        const baseUrl = input.baseUrl === undefined
          ? binding.target.baseUrl
          : normalizeTargetUrl(
              input.baseUrl,
              binding.service.kind as CreateUpstreamInput['kind']
            ).toString()
        if (new URL(baseUrl).protocol.slice(0, -1) !== binding.service.protocol) {
          throw createApplicationError({ statusCode: 400, message: 'target protocol must match its upstream', data: { code: 'UPSTREAM_PROTOCOL_MISMATCH' } })
        }
        const resetServiceState = binding.service.kind === 'internal'
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
          workspaceId: binding.service.workspaceId,
          publishRouting: binding.service.kind === 'external'
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
    options: { transaction?: DatabaseTransaction } = {}
  ) {
    if (await routingReferenceService.hasTarget(id, options.transaction)) {
      throw createApplicationError({
        statusCode: 409,
        message: 'disable the target and publish routing before deleting it',
        data: { code: 'TARGET_STILL_PUBLISHED' }
      })
    }
    const remove = async (tx: DatabaseTransaction) => {
      const binding = await findTargetBindingForUpdate(tx, id)
      if (!binding) {
        throw createApplicationError({ statusCode: 404, message: 'target not found', data: { code: 'TARGET_NOT_FOUND' } })
      }
      if (binding.target.enabled) {
        await assertCanDisableLastTarget(
          tx,
          binding.service.id,
          binding.service.kind as CreateUpstreamInput['kind'],
          binding.target.id
        )
      }
      await tx.delete(upstreamTargets).where(eq(upstreamTargets.id, id))
      return {
        target: binding.target,
        workspaceId: binding.service.workspaceId
      }
    }
    return options.transaction
      ? remove(options.transaction)
      : db.transaction(remove)
  },

  async updateServiceToken(id: string, serviceToken: string) {
    const normalizedToken = normalizeServiceToken(serviceToken)
    const updated = firstRow(await db.update(upstreamServiceConnections)
      .set({
        serviceTokenCiphertext: encryptStoredSecret(
          normalizedToken,
          'service-token'
        ),
        lastDiscoveryError: 'Service Token changed; run discovery to verify the connection',
        updatedAt: new Date()
      })
      .where(eq(upstreamServiceConnections.upstreamServiceId, id))
      .returning())
    if (!updated) {
      throw createApplicationError({
        statusCode: 404,
        message: 'controllable internal upstream not found',
        data: { code: 'SERVICE_CONNECTION_NOT_FOUND' }
      })
    }
    invalidateUpstreamServiceToken(id)
    return toServiceConnectionView(updated)
  },

  async updateAndPublish(
    id: string,
    input: UpdateUpstreamInput,
    createdBy: number | null
  ) {
    const committed = await applyWorkspaceMutation(createdBy, async (tx) => {
      const upstream = await platformUpstreamService.update(id, input, {
        transaction: tx
      })
      return { value: upstream, workspaceId: upstream.workspaceId }
    })
    const { value: upstream, ...publication } = committed
    return { upstream, ...publication }
  },

  async removeAndPublish(id: string, createdBy: number | null) {
    const committed = await applyWorkspaceMutation(createdBy, async (tx) => {
      const upstream = await platformUpstreamService.remove(id, {
        transaction: tx
      })
      return { value: upstream, workspaceId: upstream.workspaceId }
    })
    const { value: upstream, ...publication } = committed
    return { upstream, ...publication }
  },

  async createTargetAndPublish(
    upstreamServiceId: string,
    input: CreateTargetInput,
    createdBy: number | null
  ) {
    const committed = await applyWorkspaceMutation(createdBy, async (tx) => {
      const created = await platformUpstreamService.createTarget(
        upstreamServiceId,
        input,
        { transaction: tx }
      )
      return {
        value: created.target,
        workspaceId: created.workspaceId,
        publishRouting: created.publishRouting
      }
    })
    const { value: target, ...publication } = committed
    return { target, ...publication }
  },

  async updateTargetAndPublish(
    id: string,
    input: UpdateTargetInput,
    createdBy: number | null
  ) {
    const committed = await applyWorkspaceMutation(createdBy, async (tx) => {
      const updated = await platformUpstreamService.updateTarget(id, input, {
        transaction: tx
      })
      return {
        value: updated.target,
        workspaceId: updated.workspaceId,
        publishRouting: updated.publishRouting
      }
    })
    const { value: target, ...publication } = committed
    return { target, ...publication }
  },

  async removeTargetAndPublish(id: string, createdBy: number | null) {
    const committed = await applyWorkspaceMutation(createdBy, async (tx) => {
      const removed = await platformUpstreamService.removeTarget(id, {
        transaction: tx
      })
      return {
        value: removed.target,
        workspaceId: removed.workspaceId
      }
    })
    const { value: target, ...publication } = committed
    return { target, ...publication }
  }
}
