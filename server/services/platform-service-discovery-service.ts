import { createHash } from 'node:crypto'
import { eq } from 'drizzle-orm'
import type { ServiceDescription } from '#shared/types/service-control'
import { db } from '~~/server/db/client'
import {
  upstreamServiceConnections,
  upstreamTargets
} from '~~/server/db/schema'
import { createApplicationError } from '~~/server/errors/application-error'
import {
  buildServiceControlView,
  loadServiceControlContext,
  safeServiceControlError
} from '~~/server/services/platform-service-control-context'
import { persistServiceOpenApi } from '~~/server/services/platform-service-openapi-service'
import { upstreamServiceTokenService } from '~~/server/services/upstream-service-token-service'
import { canonicalJson } from '~~/server/utils/canonical-json'
import { serviceControlClient } from '~~/server/utils/service-control-client'
import { assertServiceConfigurationDefinition } from '~~/server/utils/service-configuration-values'

function assertMatchingDescriptions(descriptions: ServiceDescription[]) {
  const first = descriptions[0]
  if (!first) throw new Error('service has no enabled targets')
  for (const description of descriptions.slice(1)) {
    if (
      description.serviceId !== first.serviceId
      || description.openapiSha256 !== first.openapiSha256
      || description.configuration.schemaSha256
      !== first.configuration.schemaSha256
      || description.openapi !== first.openapi
      || description.configuration.schema !== first.configuration.schema
      || description.configuration.state !== first.configuration.state
      || description.configuration.update !== first.configuration.update
      || description.health !== first.health
      || description.readiness !== first.readiness
    ) {
      throw createApplicationError({
        statusCode: 409,
        message: 'upstream targets do not expose the same Service contract',
        data: { code: 'SERVICE_TARGET_CONTRACT_MISMATCH' }
      })
    }
  }
  return first
}

export async function discoverPlatformService(upstreamServiceId: string) {
  const context = await loadServiceControlContext(upstreamServiceId)
  const enabledTargets = context.targets.filter(target => target.enabled)
  if (enabledTargets.length === 0) {
    throw createApplicationError({
      statusCode: 409,
      message: 'Service has no enabled targets',
      data: { code: 'SERVICE_HAS_NO_TARGETS' }
    })
  }
  const token = await upstreamServiceTokenService.get(upstreamServiceId)
  if (!token) {
    throw createApplicationError({
      statusCode: 409,
      message: 'Service Token is not configured',
      data: { code: 'SERVICE_TOKEN_REQUIRED' }
    })
  }

  const targetResults = await Promise.allSettled(
    enabledTargets.map(async (target) => {
      const description = await serviceControlClient.getDescription(
        target.baseUrl,
        token
      )
      const [definition, state] = await Promise.all([
        serviceControlClient.getConfigurationDefinition(
          target.baseUrl,
          description.data.configuration.schema,
          token
        ),
        serviceControlClient.getConfigurationState(
          target.baseUrl,
          description.data.configuration.state,
          token
        )
      ])
      const schemaSha256 = createHash('sha256')
        .update(canonicalJson(definition.data))
        .digest('hex')
      assertServiceConfigurationDefinition(definition.data)
      if (
        description.headers.get('x-openapi-sha256')
        !== description.data.openapiSha256
      ) {
        throw createApplicationError({
          statusCode: 409,
          message: 'Service description fingerprint mismatch',
          data: { code: 'SERVICE_OPENAPI_HASH_MISMATCH' }
        })
      }
      if (
        schemaSha256 !== description.data.configuration.schemaSha256
        || definition.headers.get('x-configuration-schema-sha256')
        !== schemaSha256
        || state.data.serviceId !== description.data.serviceId
        || state.data.schemaSha256 !== schemaSha256
      ) {
        throw createApplicationError({
          statusCode: 409,
          message: 'Service configuration fingerprint mismatch',
          data: { code: 'SERVICE_CONFIGURATION_HASH_MISMATCH' }
        })
      }
      return {
        target,
        description: description.data,
        definition: definition.data,
        state: state.data
      }
    })
  )

  const failed = targetResults
    .map((result, index) => ({ result, target: enabledTargets[index]! }))
    .filter((entry): entry is {
      result: PromiseRejectedResult
      target: typeof upstreamTargets.$inferSelect
    } => entry.result.status === 'rejected')
  await Promise.all(failed.map(entry => db.update(upstreamTargets).set({
    configurationStatus: 'error',
    lastError: safeServiceControlError(entry.result.reason),
    lastConfigurationSyncAt: new Date(),
    updatedAt: new Date()
  }).where(eq(upstreamTargets.id, entry.target.id))))
  if (failed.length > 0) {
    const error = failed[0]!.result.reason
    await db.update(upstreamServiceConnections).set({
      lastDiscoveryError: safeServiceControlError(error),
      updatedAt: new Date()
    }).where(eq(
      upstreamServiceConnections.upstreamServiceId,
      upstreamServiceId
    ))
    throw createApplicationError({
      statusCode: 502,
      message: `one or more Service targets could not be discovered: ${safeServiceControlError(error)}`,
      data: {
        code: 'SERVICE_DISCOVERY_FAILED',
        failedTargets: failed.length
      }
    })
  }

  const discovered = targetResults.flatMap(result =>
    result.status === 'fulfilled' ? [result.value] : []
  )
  const description = assertMatchingDescriptions(
    discovered.map(item => item.description)
  )
  if (
    context.connection.serviceId
    && context.connection.serviceId !== description.serviceId
  ) {
    throw createApplicationError({
      statusCode: 409,
      message: 'discovered Service identity differs from the existing connection',
      data: { code: 'SERVICE_IDENTITY_MISMATCH' }
    })
  }
  const first = discovered[0]!
  const openapi = await serviceControlClient.getOpenAPI(
    first.target.baseUrl,
    description.openapi,
    token
  )
  await persistServiceOpenApi({
    workspaceId: context.service.workspaceId,
    upstreamServiceId: context.service.id,
    description,
    document: openapi.data,
    reportedSha256: openapi.headers.get('x-openapi-sha256'),
    sourceUrl: openapi.url
  })

  const now = new Date()
  const schemaChanged = Boolean(
    context.connection.configurationSchemaSha256
    && context.connection.configurationSchemaSha256
    !== description.configuration.schemaSha256
  )
  await db.update(upstreamServiceConnections).set({
    serviceId: description.serviceId,
    serviceName: description.name,
    serviceVersion: description.version,
    serviceCommit: description.commit,
    platformProtocol: description.platformProtocol,
    serviceDescription: description,
    openapiSha256: description.openapiSha256,
    configurationSchemaSha256: description.configuration.schemaSha256,
    configurationSchema: first.definition,
    configurationHash: schemaChanged
      ? null
      : context.connection.configurationHash,
    lastDiscoveredAt: now,
    lastDiscoveryError: null,
    updatedAt: now
  }).where(eq(
    upstreamServiceConnections.upstreamServiceId,
    upstreamServiceId
  ))

  await Promise.all(discovered.map((item) => {
    const matchesDesired = !schemaChanged
      && context.connection.configurationRevision > 0
      && item.state.revision === context.connection.configurationRevision
      && item.state.configurationSha256
      === context.connection.configurationHash
    return db.update(upstreamTargets).set({
      configurationRevision: item.state.revision,
      configurationHash: item.state.configurationSha256,
      configurationStatus: matchesDesired
        ? 'synced'
        : (
            context.connection.configurationRevision > 0
              ? 'drifted'
              : 'unknown'
          ),
      configurationState: item.state,
      lastConfigurationSyncAt: now,
      lastError: null,
      updatedAt: now
    }).where(eq(upstreamTargets.id, item.target.id))
  }))
  return buildServiceControlView(
    await loadServiceControlContext(upstreamServiceId),
    { checkAvailability: true }
  )
}
