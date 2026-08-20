import { createHash } from 'node:crypto'
import { eq } from 'drizzle-orm'
import type {
  RedactedServiceConfigurationState,
  ServiceConfigurationDefinition,
  ServiceDescription
} from '#shared/types/service-control'
import { db, type DatabaseTransaction } from '~~/server/db/client'
import {
  upstreamServiceConnections,
  upstreamTargets
} from '~~/server/db/schema'
import { createApplicationError } from '~~/server/errors/application-error'
import {
  buildServiceControlView,
  loadServiceControlContext,
  safeServiceControlError,
  type PlatformServiceControlContext
} from '~~/server/services/platform-service-control-context'
import { persistServiceOpenApi } from '~~/server/services/platform-service-openapi-service'
import { applyWorkspaceRevision } from '~~/server/services/platform-endpoint-publication-service'
import { upstreamServiceTokenService } from '~~/server/services/upstream-service-token-service'
import { canonicalJson } from '~~/server/utils/canonical-json'
import { firstRow } from '~~/server/utils/row'
import {
  UnsupportedServiceProtocolError,
  serviceControlClient
} from '~~/server/utils/service-control-client'
import { assertServiceConfigurationDefinition } from '~~/server/utils/service-configuration-values'
import { areEnabledInternalTargetsReady } from '~~/server/utils/internal-upstream-readiness'

interface DiscoveredTarget {
  targetId: string
  description: ServiceDescription
  definition: ServiceConfigurationDefinition
  state: RedactedServiceConfigurationState
}

interface DiscoveryFetchSuccess {
  ok: true
  targets: DiscoveredTarget[]
  description: ServiceDescription
  openapi: {
    document: Record<string, unknown>
    reportedSha256: string | null
    sourceUrl: string
  }
}

interface DiscoveryFetchFailure {
  ok: false
  error: unknown
  targetErrors: ReadonlyMap<string, string>
}

type DiscoveryFetchResult = DiscoveryFetchSuccess | DiscoveryFetchFailure

const activeDiscoveries = new Map<
  string,
  ReturnType<typeof performPlatformServiceDiscovery>
>()

function assertMatchingDescriptions(descriptions: ServiceDescription[]) {
  const first = descriptions[0]
  if (!first) throw new Error('service has no enabled targets')
  for (const description of descriptions.slice(1)) {
    if (
      description.serviceId !== first.serviceId
      || description.name !== first.name
      || description.serviceProtocol !== first.serviceProtocol
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

function discoveryContextFingerprint(
  context: PlatformServiceControlContext
): string {
  return canonicalJson({
    service: {
      openapiDocumentId: context.service.openapiDocumentId,
      updatedAt: context.service.updatedAt.toISOString()
    },
    connection: {
      serviceTokenCiphertext: context.connection.serviceTokenCiphertext,
      updatedAt: context.connection.updatedAt.toISOString()
    },
    targets: context.targets
      .map(target => ({
        id: target.id,
        baseUrl: target.baseUrl,
        enabled: target.enabled,
        updatedAt: target.updatedAt.toISOString()
      }))
      .sort((left, right) => left.id.localeCompare(right.id))
  })
}

async function loadCurrentDiscoveryContext(
  tx: DatabaseTransaction,
  upstreamServiceId: string
) {
  return loadServiceControlContext(upstreamServiceId, {
    transaction: tx,
    forUpdate: true
  })
}

function assertDiscoveryContextCurrent(
  expected: PlatformServiceControlContext,
  current: PlatformServiceControlContext
) {
  if (
    discoveryContextFingerprint(expected)
    !== discoveryContextFingerprint(current)
  ) {
    throw createApplicationError({
      statusCode: 409,
      message: 'Service changed while discovery was running; retry discovery',
      data: { code: 'SERVICE_DISCOVERY_CONFLICT' }
    })
  }
}

async function fetchServiceSnapshot(
  context: PlatformServiceControlContext,
  token: string
): Promise<DiscoveryFetchResult> {
  const enabledTargets = context.targets.filter(target => target.enabled)
  const targetResults = await Promise.allSettled(
    enabledTargets.map(async (target): Promise<DiscoveredTarget> => {
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
        targetId: target.id,
        description: description.data,
        definition: definition.data,
        state: state.data
      }
    })
  )

  const targetErrors = new Map<string, string>()
  targetResults.forEach((result, index) => {
    if (result.status === 'rejected') {
      targetErrors.set(
        enabledTargets[index]!.id,
        safeServiceControlError(result.reason)
      )
    }
  })
  if (targetErrors.size > 0) {
    const firstError = targetResults.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected'
    )!.reason
    const protocolError = targetResults.find(
      (result): result is PromiseRejectedResult => (
        result.status === 'rejected'
        && result.reason instanceof UnsupportedServiceProtocolError
      )
    )?.reason
    if (protocolError instanceof UnsupportedServiceProtocolError) {
      return {
        ok: false,
        error: createApplicationError({
          statusCode: 409,
          message: protocolError.message,
          data: {
            code: 'SERVICE_PROTOCOL_UNSUPPORTED',
            serviceProtocol: protocolError.serviceProtocol,
            supportedProtocols: protocolError.supportedProtocols
          }
        }),
        targetErrors
      }
    }
    return {
      ok: false,
      error: createApplicationError({
        statusCode: 502,
        message: `one or more Service targets could not be discovered: ${safeServiceControlError(firstError)}`,
        data: {
          code: 'SERVICE_DISCOVERY_FAILED',
          failedTargets: targetErrors.size
        }
      }),
      targetErrors
    }
  }

  try {
    const targets = targetResults.flatMap(result => (
      result.status === 'fulfilled' ? [result.value] : []
    ))
    const description = assertMatchingDescriptions(
      targets.map(item => item.description)
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
    const first = targets[0]!
    const firstTarget = context.targets.find(
      target => target.id === first.targetId
    )!
    const openapi = await serviceControlClient.getOpenAPI(
      firstTarget.baseUrl,
      description.openapi,
      token
    )
    return {
      ok: true,
      targets,
      description,
      openapi: {
        document: openapi.data,
        reportedSha256: openapi.headers.get('x-openapi-sha256'),
        sourceUrl: openapi.url
      }
    }
  } catch (error) {
    return { ok: false, error, targetErrors }
  }
}

async function recordDiscoveryFailure(
  context: PlatformServiceControlContext,
  failure: DiscoveryFetchFailure
) {
  await db.transaction(async (tx) => {
    const current = await loadCurrentDiscoveryContext(tx, context.service.id)
    if (
      discoveryContextFingerprint(context)
      !== discoveryContextFingerprint(current)
    ) return

    const now = new Date()
    for (const [targetId, message] of failure.targetErrors) {
      await tx.update(upstreamTargets).set({
        configurationStatus: 'error',
        lastError: message,
        lastConfigurationSyncAt: now,
        updatedAt: now
      }).where(eq(upstreamTargets.id, targetId))
    }
    await tx.update(upstreamServiceConnections).set({
      lastDiscoveryError: safeServiceControlError(failure.error),
      updatedAt: now
    }).where(eq(
      upstreamServiceConnections.upstreamServiceId,
      context.service.id
    ))
  }).catch(() => undefined)
}

async function commitServiceSnapshot(
  context: PlatformServiceControlContext,
  snapshot: DiscoveryFetchSuccess
) {
  await db.transaction(async (tx) => {
    const current = await loadCurrentDiscoveryContext(tx, context.service.id)
    assertDiscoveryContextCurrent(context, current)

    const first = snapshot.targets[0]!
    const schemaChanged = Boolean(
      current.connection.configurationSchemaSha256
      && current.connection.configurationSchemaSha256
      !== snapshot.description.configuration.schemaSha256
    )
    await persistServiceOpenApi({
      workspaceId: current.service.workspaceId,
      upstreamServiceId: current.service.id,
      description: snapshot.description,
      document: snapshot.openapi.document,
      reportedSha256: snapshot.openapi.reportedSha256,
      sourceUrl: snapshot.openapi.sourceUrl,
      transaction: tx
    })

    const now = new Date()
    const updatedConnection = firstRow(
      await tx.update(upstreamServiceConnections).set({
        serviceId: snapshot.description.serviceId,
        serviceName: snapshot.description.name,
        serviceVersion: snapshot.description.version,
        serviceCommit: snapshot.description.commit,
        serviceProtocol: snapshot.description.serviceProtocol,
        serviceDescription: snapshot.description,
        openapiSha256: snapshot.description.openapiSha256,
        configurationSchemaSha256:
          snapshot.description.configuration.schemaSha256,
        configurationSchema: first.definition,
        ...(schemaChanged ? { configurationHash: null } : {}),
        lastDiscoveredAt: now,
        lastDiscoveryError: null,
        updatedAt: now
      }).where(eq(
        upstreamServiceConnections.upstreamServiceId,
        current.service.id
      )).returning()
    )
    if (!updatedConnection) {
      throw new Error('Service connection disappeared during discovery')
    }

    for (const item of snapshot.targets) {
      const matchesDesired = updatedConnection.configurationHash !== null
        && updatedConnection.configurationRevision > 0
        && item.state.revision === updatedConnection.configurationRevision
        && item.state.configurationSha256 === updatedConnection.configurationHash
      await tx.update(upstreamTargets).set({
        configurationRevision: item.state.revision,
        configurationHash: item.state.configurationSha256,
        configurationStatus: !updatedConnection.configurationHash
          ? 'unknown'
          : matchesDesired ? 'synced' : 'drifted',
        configurationState: item.state,
        lastConfigurationSyncAt: now,
        lastError: null,
        updatedAt: now
      }).where(eq(upstreamTargets.id, item.targetId))
    }
  })
}

async function performPlatformServiceDiscovery(upstreamServiceId: string) {
  const context = await loadServiceControlContext(upstreamServiceId)
  if (!context.targets.some(target => target.enabled)) {
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

  const snapshot = await fetchServiceSnapshot(context, token)
  if (!snapshot.ok) {
    await recordDiscoveryFailure(context, snapshot)
    throw snapshot.error
  }
  try {
    await commitServiceSnapshot(context, snapshot)
  } catch (error) {
    await recordDiscoveryFailure(context, {
      ok: false,
      error,
      targetErrors: new Map()
    })
    throw error
  }

  const refreshed = await loadServiceControlContext(upstreamServiceId)
  const publication = areEnabledInternalTargetsReady(
    refreshed.targets,
    refreshed.connection
  )
    ? await applyWorkspaceRevision(refreshed.service.workspaceId, null)
    : { revisions: [] }
  return {
    ...await buildServiceControlView(
      refreshed,
      { checkAvailability: true }
    ),
    ...publication
  }
}

async function runPlatformServiceDiscovery(upstreamServiceId: string) {
  try {
    return await performPlatformServiceDiscovery(upstreamServiceId)
  } finally {
    activeDiscoveries.delete(upstreamServiceId)
  }
}

export function discoverPlatformService(upstreamServiceId: string) {
  const active = activeDiscoveries.get(upstreamServiceId)
  if (active) return active

  const discovery = runPlatformServiceDiscovery(upstreamServiceId)
  activeDiscoveries.set(upstreamServiceId, discovery)
  return discovery
}
