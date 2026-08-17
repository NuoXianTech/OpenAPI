import { and, eq } from 'drizzle-orm'
import type {
  ServiceAvailability,
  ServiceConfigurationDefinition,
  ServiceConfigurationValue,
  ServiceConfigurationView,
  ServiceTargetAvailability,
  ServiceConnectionView,
  ServiceTargetControlState,
  StoredServiceConfigurationValues
} from '#shared/types/service-control'
import { db } from '~~/server/db/client'
import {
  openapiDocuments,
  upstreamServiceConnections,
  upstreamServices,
  upstreamTargets
} from '~~/server/db/schema'
import { createApplicationError } from '~~/server/errors/application-error'
import { resolveServiceAvailability } from '~~/server/services/service-availability-service'
import { upstreamServiceTokenService } from '~~/server/services/upstream-service-token-service'
import { readStoredServiceEndpoints } from '~~/server/services/platform-service-openapi-service'
import {
  defaultServiceConfigurationValues,
  serviceConfigurationFields
} from '~~/server/utils/service-configuration-values'
import { toNullableIsoString } from '~~/server/utils/date'
import { firstRow } from '~~/server/utils/row'

export interface PlatformServiceControlContext {
  service: typeof upstreamServices.$inferSelect
  connection: typeof upstreamServiceConnections.$inferSelect
  targets: Array<typeof upstreamTargets.$inferSelect>
}

export interface ServiceViewOptions {
  checkAvailability?: boolean
}

export function toServiceConnectionView(
  connection: typeof upstreamServiceConnections.$inferSelect,
  availability: ServiceAvailability = 'unknown'
): ServiceConnectionView {
  return {
    upstreamServiceId: connection.upstreamServiceId,
    discovered: Boolean(connection.serviceId && connection.serviceDescription),
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
    lastDiscoveredAt: toNullableIsoString(connection.lastDiscoveredAt),
    lastConfigurationSyncAt: toNullableIsoString(
      connection.lastConfigurationSyncAt
    ),
    lastDiscoveryError: connection.lastDiscoveryError
  }
}

function publicDesiredValues(
  definition: ServiceConfigurationDefinition | null,
  stored: StoredServiceConfigurationValues
): Record<
  string,
  ServiceConfigurationValue | { configured: boolean }
> {
  if (!definition) return {}
  const defaults = defaultServiceConfigurationValues(definition)
  return Object.fromEntries(
    serviceConfigurationFields(definition).map(field => [
      field.key,
      field.type === 'secret'
        ? { configured: Boolean(stored.secrets[field.key]) }
        : stored.values[field.key] ?? defaults[field.key]!
    ])
  )
}

export function serviceTargetControlState(
  target: typeof upstreamTargets.$inferSelect,
  availability: ServiceTargetAvailability
): ServiceTargetControlState {
  return {
    id: target.id,
    baseUrl: target.baseUrl,
    enabled: target.enabled,
    availability,
    configurationRevision: target.configurationRevision,
    configurationHash: target.configurationHash,
    configurationStatus: target.configurationStatus as
      ServiceTargetControlState['configurationStatus'],
    configurationState: target.configurationState ?? null,
    lastConfigurationSyncAt: toNullableIsoString(
      target.lastConfigurationSyncAt
    ),
    lastError: target.lastError
  }
}

export function safeServiceControlError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'unknown error'
  return message.slice(0, 500)
}

export async function loadServiceControlContext(
  upstreamServiceId: string
): Promise<PlatformServiceControlContext> {
  const row = firstRow(await db.select({
    service: upstreamServices,
    connection: upstreamServiceConnections
  }).from(upstreamServices)
    .innerJoin(upstreamServiceConnections, eq(
      upstreamServiceConnections.upstreamServiceId,
      upstreamServices.id
    ))
    .where(and(
      eq(upstreamServices.id, upstreamServiceId),
      eq(upstreamServices.kind, 'internal')
    ))
    .limit(1))
  if (!row) {
    throw createApplicationError({
      statusCode: 404,
      message: 'controllable internal upstream not found',
      data: { code: 'SERVICE_CONNECTION_NOT_FOUND' }
    })
  }
  const targets = await db.select().from(upstreamTargets)
    .where(eq(upstreamTargets.upstreamServiceId, upstreamServiceId))
  return { ...row, targets }
}

export async function buildServiceControlView(
  context: PlatformServiceControlContext,
  options: ServiceViewOptions = {}
): Promise<ServiceConfigurationView> {
  const document = context.service.openapiDocumentId
    ? firstRow(await db.select({
        summary: openapiDocuments.parsedSummary
      }).from(openapiDocuments)
        .where(eq(
          openapiDocuments.id,
          context.service.openapiDocumentId
        ))
        .limit(1))
    : null
  const availability = options.checkAvailability === true
    && context.service.status === 'active'
    ? await resolveServiceAvailability(
        context.connection.serviceDescription,
        context.targets,
        await upstreamServiceTokenService.get(context.service.id)
      )
    : { overall: 'unknown' as const, targets: new Map() }
  return {
    connection: toServiceConnectionView(
      context.connection,
      availability.overall
    ),
    definition: context.connection.configurationSchema ?? null,
    values: publicDesiredValues(
      context.connection.configurationSchema ?? null,
      context.connection.configurationValues
    ),
    targets: context.targets.map(target => serviceTargetControlState(
      target,
      availability.targets.get(target.id) ?? 'unknown'
    )),
    endpoints: document ? readStoredServiceEndpoints(document.summary) : []
  }
}
