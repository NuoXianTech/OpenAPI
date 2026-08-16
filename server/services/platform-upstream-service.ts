import { isIP } from 'node:net'
import { and, asc, eq, isNull } from 'drizzle-orm'
import { ipInAnyCidr } from '#shared/utils/cidr'
import type { ServiceAvailability } from '#shared/types/service-control'
import { db } from '~~/server/db/client'
import {
  upstreamServiceConnections,
  upstreamServices,
  upstreamTargets
} from '~~/server/db/schema'
import { createApplicationError } from '~~/server/errors/application-error'
import { resolveServiceAvailability } from '~~/server/services/service-availability-service'
import { getSqlState } from '~~/server/utils/database-error'
import { firstRow } from '~~/server/utils/row'
import { encryptStoredSecret } from '~~/server/utils/stored-secret'
import { invalidateUpstreamServiceToken } from '~~/server/services/upstream-service-token-service'

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

function publicConnection(
  connection: typeof upstreamServiceConnections.$inferSelect | null,
  availability: ServiceAvailability = 'unknown'
) {
  if (!connection) return null
  return {
    upstreamServiceId: connection.upstreamServiceId,
    discovered: Boolean(connection.serviceId),
    availability,
    tokenConfigured: Boolean(connection.serviceTokenCiphertext),
    serviceId: connection.serviceId,
    serviceName: connection.serviceName,
    serviceVersion: connection.serviceVersion,
    serviceCommit: connection.serviceCommit,
    platformProtocol: connection.platformProtocol,
    openapiSha256: connection.openapiSha256,
    configurationSchemaSha256: connection.configurationSchemaSha256,
    configurationRevision: connection.configurationRevision,
    configurationHash: connection.configurationHash,
    lastDiscoveredAt: connection.lastDiscoveredAt,
    lastConfigurationSyncAt: connection.lastConfigurationSyncAt,
    lastDiscoveryError: connection.lastDiscoveryError
  }
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
    const hostname = url.hostname.toLowerCase().replace(/\.$/, '')
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

export const platformUpstreamService = {
  async list(
    workspaceId?: string,
    options: { checkAvailability?: boolean } = {}
  ) {
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
        : await resolveServiceAvailability(
            connectionRecord?.serviceDescription ?? null,
            upstream.targets
          )
      return {
        ...upstream,
        connection: publicConnection(connectionRecord, availability)
      }
    }))
  },

  async create(input: CreateUpstreamInput) {
    if (input.kind === 'internal' && (!input.serviceToken || input.serviceToken.length < 32)) {
      throw createApplicationError({
        statusCode: 400,
        message: 'internal upstream requires a Service Token with at least 32 characters',
        data: { code: 'SERVICE_TOKEN_REQUIRED' }
      })
    }
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
                input.serviceToken!,
                'service-token'
              )
            }).returning())
          : null
        return {
          ...service,
          targets,
          connection: publicConnection(connection)
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

  async findById(id: string) {
    return firstRow(await db.select().from(upstreamServices)
      .where(eq(upstreamServices.id, id))
      .limit(1))
  },

  async updateServiceToken(id: string, serviceToken: string) {
    const updated = firstRow(await db.update(upstreamServiceConnections)
      .set({
        serviceTokenCiphertext: encryptStoredSecret(
          serviceToken,
          'service-token'
        ),
        lastDiscoveryError: null,
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
    return publicConnection(updated)
  }
}
