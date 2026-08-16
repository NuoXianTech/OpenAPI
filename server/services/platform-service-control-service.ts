import { createHash } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import type {
  RedactedServiceConfigurationState,
  ServiceConfigurationDefinition,
  ServiceConfigurationSyncResult,
  ServiceConfigurationValue,
  ServiceConfigurationView,
  ServiceConnectionView,
  ServiceDescription,
  ServiceEndpointSummary,
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
import { upstreamServiceTokenService } from '~~/server/services/upstream-service-token-service'
import { canonicalJson } from '~~/server/utils/canonical-json'
import { serviceControlClient } from '~~/server/utils/service-control-client'
import {
  assertServiceConfigurationDefinition,
  calculateServiceConfigurationHash,
  defaultServiceConfigurationValues,
  normalizeServiceConfigurationValues,
  serviceConfigurationFields,
  ServiceConfigurationValueError
} from '~~/server/utils/service-configuration-values'
import {
  decryptStoredSecret,
  encryptStoredSecret
} from '~~/server/utils/stored-secret'
import { firstRow } from '~~/server/utils/row'

const OPENAPI_METHODS = [
  'get',
  'head',
  'post',
  'put',
  'patch',
  'delete',
  'options'
] as const

interface ControlContext {
  service: typeof upstreamServices.$inferSelect
  connection: typeof upstreamServiceConnections.$inferSelect
  targets: Array<typeof upstreamTargets.$inferSelect>
}

async function loadControlContext(
  upstreamServiceId: string
): Promise<ControlContext> {
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

function connectionView(
  connection: typeof upstreamServiceConnections.$inferSelect
): ServiceConnectionView {
  return {
    upstreamServiceId: connection.upstreamServiceId,
    connected: Boolean(connection.serviceId && connection.serviceDescription),
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
    lastDiscoveredAt: toISOString(connection.lastDiscoveredAt),
    lastConfigurationSyncAt: toISOString(
      connection.lastConfigurationSyncAt
    ),
    lastDiscoveryError: connection.lastDiscoveryError
  }
}

function targetControlState(
  target: typeof upstreamTargets.$inferSelect
): ServiceTargetControlState {
  return {
    id: target.id,
    baseUrl: target.baseUrl,
    enabled: target.enabled,
    configurationRevision: target.configurationRevision,
    configurationHash: target.configurationHash,
    configurationStatus: target.configurationStatus as
      ServiceTargetControlState['configurationStatus'],
    configurationState: target.configurationState ?? null,
    lastConfigurationSyncAt: toISOString(
      target.lastConfigurationSyncAt
    ),
    lastError: target.lastError
  }
}

function toISOString(value: Date | null): string | null {
  return value?.toISOString() ?? null
}

function endpointSummary(
  document: Record<string, unknown>
): ServiceEndpointSummary[] {
  const paths = document.paths
  if (!paths || typeof paths !== 'object' || Array.isArray(paths)) return []
  const endpoints: ServiceEndpointSummary[] = []
  for (const [path, pathItem] of Object.entries(
    paths as Record<string, unknown>
  )) {
    if (!pathItem || typeof pathItem !== 'object' || Array.isArray(pathItem)) {
      continue
    }
    const operations = pathItem as Record<string, unknown>
    for (const method of OPENAPI_METHODS) {
      const operation = operations[method]
      if (!operation || typeof operation !== 'object' || Array.isArray(operation)) {
        continue
      }
      const value = operation as Record<string, unknown>
      const tags = Array.isArray(value.tags)
        ? value.tags.filter((tag): tag is string => typeof tag === 'string')
        : []
      endpoints.push({
        method: method.toUpperCase(),
        path,
        operationId: typeof value.operationId === 'string'
          ? value.operationId
          : null,
        summary: typeof value.summary === 'string' ? value.summary : null,
        tags,
        system: tags.includes('System')
      })
    }
  }
  return endpoints.sort((left, right) => (
    Number(left.system) - Number(right.system)
    || left.path.localeCompare(right.path)
    || left.method.localeCompare(right.method)
  ))
}

function readStoredEndpoints(
  summary: Record<string, unknown>
): ServiceEndpointSummary[] {
  const endpoints = summary.endpoints
  if (!Array.isArray(endpoints)) return []
  return endpoints.flatMap((endpoint) => {
    if (!endpoint || typeof endpoint !== 'object' || Array.isArray(endpoint)) {
      return []
    }
    const value = endpoint as Partial<ServiceEndpointSummary>
    if (
      typeof value.method !== 'string'
      || typeof value.path !== 'string'
      || !Array.isArray(value.tags)
      || typeof value.system !== 'boolean'
    ) return []
    return [{
      method: value.method,
      path: value.path,
      operationId: typeof value.operationId === 'string'
        ? value.operationId
        : null,
      summary: typeof value.summary === 'string' ? value.summary : null,
      tags: value.tags.filter((tag): tag is string => typeof tag === 'string'),
      system: value.system
    }]
  })
}

function publicDesiredValues(
  definition: ServiceConfigurationDefinition | null,
  stored: StoredServiceConfigurationValues
) {
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

async function buildView(
  context: ControlContext
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
  return {
    connection: connectionView(context.connection),
    definition: context.connection.configurationSchema ?? null,
    values: publicDesiredValues(
      context.connection.configurationSchema ?? null,
      context.connection.configurationValues
    ),
    targets: context.targets.map(targetControlState),
    endpoints: document ? readStoredEndpoints(document.summary) : []
  }
}

function assertMatchingDescriptions(
  descriptions: ServiceDescription[]
) {
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

async function persistOpenAPI(input: {
  context: ControlContext
  description: ServiceDescription
  document: Record<string, unknown>
  sourceUrl: string
}) {
  const calculatedHash = createHash('sha256')
    .update(canonicalJson(input.document))
    .digest('hex')
  if (calculatedHash !== input.description.openapiSha256) {
    throw createApplicationError({
      statusCode: 409,
      message: 'Service OpenAPI fingerprint does not match its document',
      data: { code: 'SERVICE_OPENAPI_HASH_MISMATCH' }
    })
  }
  const existing = firstRow(await db.select().from(openapiDocuments)
    .where(and(
      eq(openapiDocuments.workspaceId, input.context.service.workspaceId),
      eq(openapiDocuments.contentHash, calculatedHash)
    ))
    .limit(1))
  const endpoints = endpointSummary(input.document)
  const document = existing ?? firstRow(await db.insert(openapiDocuments)
    .values({
      workspaceId: input.context.service.workspaceId,
      upstreamServiceId: input.context.service.id,
      sourceType: 'url',
      sourceUrl: input.sourceUrl,
      format: 'json',
      specVersion: typeof input.document.openapi === 'string'
        ? input.document.openapi
        : '3.1.0',
      content: input.document,
      contentHash: calculatedHash,
      parsedSummary: {
        endpointCount: endpoints.filter(endpoint => !endpoint.system).length,
        endpoints
      },
      fetchedAt: new Date()
    })
    .returning())
  if (!document) throw new Error('OpenAPI document insert returned no row')
  if (existing) {
    await db.update(openapiDocuments).set({
      upstreamServiceId: input.context.service.id,
      sourceUrl: input.sourceUrl,
      parsedSummary: {
        endpointCount: endpoints.filter(endpoint => !endpoint.system).length,
        endpoints
      },
      fetchedAt: new Date()
    }).where(eq(openapiDocuments.id, existing.id))
  }
  await db.update(upstreamServices).set({
    openapiDocumentId: document.id,
    updatedAt: new Date()
  }).where(eq(upstreamServices.id, input.context.service.id))
}

function redactedStateFromValues(input: {
  serviceId: string
  schemaSha256: string
  revision: number
  configurationSha256: string
  values: Record<string, ServiceConfigurationValue>
  definition: ServiceConfigurationDefinition
  updatedAt: string
}): RedactedServiceConfigurationState {
  const fields = new Map(
    serviceConfigurationFields(input.definition)
      .map(field => [field.key, field])
  )
  return {
    schemaVersion: 1,
    serviceId: input.serviceId,
    schemaSha256: input.schemaSha256,
    revision: input.revision,
    configurationSha256: input.configurationSha256,
    values: Object.fromEntries(Object.entries(input.values).map(
      ([key, value]) => [
        key,
        fields.get(key)?.type === 'secret'
          ? { configured: typeof value === 'string' && value.length > 0 }
          : value
      ]
    )),
    updatedAt: input.updatedAt
  }
}

function safeControlError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'unknown error'
  return message.slice(0, 500)
}

async function pushConfiguration(
  context: ControlContext,
  revision: number,
  values: Record<string, ServiceConfigurationValue>,
  configurationHash: string
): Promise<ServiceConfigurationSyncResult> {
  const definition = context.connection.configurationSchema
  const description = context.connection.serviceDescription
  const serviceId = context.connection.serviceId
  const schemaSha256 = context.connection.configurationSchemaSha256
  if (!definition || !description || !serviceId || !schemaSha256) {
    throw createApplicationError({
      statusCode: 409,
      message: 'discover the Service before synchronizing configuration',
      data: { code: 'SERVICE_NOT_DISCOVERED' }
    })
  }
  const enabledTargets = context.targets.filter(target => target.enabled)
  if (enabledTargets.length === 0) {
    throw createApplicationError({
      statusCode: 409,
      message: 'Service has no enabled targets',
      data: { code: 'SERVICE_HAS_NO_TARGETS' }
    })
  }
  const token = await upstreamServiceTokenService.get(context.service.id)
  if (!token) {
    throw createApplicationError({
      statusCode: 409,
      message: 'Service Token is not configured',
      data: { code: 'SERVICE_TOKEN_REQUIRED' }
    })
  }

  const results = await Promise.all(enabledTargets.map(async (target) => {
    try {
      const response = await serviceControlClient.updateConfiguration(
        target.baseUrl,
        description.configuration.update,
        token,
        { revision, values }
      )
      const matches = response.data.serviceId === serviceId
        && response.data.schemaSha256 === schemaSha256
        && response.data.configurationSha256 === configurationHash
      const state = redactedStateFromValues({
        serviceId,
        schemaSha256,
        revision: response.data.revision,
        configurationSha256: response.data.configurationSha256,
        values,
        definition,
        updatedAt: response.data.updatedAt
      })
      await db.update(upstreamTargets).set({
        configurationRevision: response.data.revision,
        configurationHash: response.data.configurationSha256,
        configurationStatus: matches ? 'synced' : 'drifted',
        configurationState: state,
        lastConfigurationSyncAt: new Date(),
        lastError: matches ? null : 'Service configuration ACK mismatch',
        updatedAt: new Date()
      }).where(eq(upstreamTargets.id, target.id))
      return matches
    } catch (error) {
      await db.update(upstreamTargets).set({
        configurationStatus: 'error',
        lastConfigurationSyncAt: new Date(),
        lastError: safeControlError(error),
        updatedAt: new Date()
      }).where(eq(upstreamTargets.id, target.id))
      return false
    }
  }))

  const successful = results.filter(Boolean).length
  const status = successful === enabledTargets.length
    ? 'synced'
    : successful > 0 ? 'partial' : 'failed'
  if (status === 'synced') {
    await db.update(upstreamServiceConnections).set({
      lastConfigurationSyncAt: new Date(),
      updatedAt: new Date()
    }).where(eq(
      upstreamServiceConnections.upstreamServiceId,
      context.service.id
    ))
  }
  const refreshed = await loadControlContext(context.service.id)
  return {
    status,
    revision,
    configurationHash,
    targets: refreshed.targets.map(targetControlState)
  }
}

function reconstructConfiguration(input: {
  definition: ServiceConfigurationDefinition
  stored: StoredServiceConfigurationValues
  valueUpdates: Record<string, unknown>
  secretUpdates: Record<string, string | null>
}) {
  const fields = serviceConfigurationFields(input.definition)
  const fieldMap = new Map(fields.map(field => [field.key, field]))
  const unknownValue = Object.keys(input.valueUpdates)
    .find(key => fieldMap.get(key)?.type === 'secret' || !fieldMap.has(key))
  if (unknownValue) {
    throw new ServiceConfigurationValueError(
      unknownValue,
      `invalid non-secret configuration field: ${unknownValue}`
    )
  }
  const unknownSecret = Object.keys(input.secretUpdates)
    .find(key => fieldMap.get(key)?.type !== 'secret')
  if (unknownSecret) {
    throw new ServiceConfigurationValueError(
      unknownSecret,
      `invalid secret configuration field: ${unknownSecret}`
    )
  }

  const defaults = defaultServiceConfigurationValues(input.definition)
  const candidate: Record<string, unknown> = {}
  for (const field of fields) {
    if (field.type === 'secret') {
      if (Object.hasOwn(input.secretUpdates, field.key)) {
        candidate[field.key] = input.secretUpdates[field.key] ?? ''
      } else {
        const ciphertext = input.stored.secrets[field.key]
        candidate[field.key] = ciphertext
          ? decryptStoredSecret(ciphertext, 'service-configuration')
          : ''
      }
      continue
    }
    candidate[field.key] = Object.hasOwn(input.valueUpdates, field.key)
      ? input.valueUpdates[field.key]
      : input.stored.values[field.key] ?? defaults[field.key]
  }
  return normalizeServiceConfigurationValues(
    input.definition,
    candidate,
    defaults
  )
}

function storeConfigurationValues(
  definition: ServiceConfigurationDefinition,
  values: Record<string, ServiceConfigurationValue>
): StoredServiceConfigurationValues {
  const stored: StoredServiceConfigurationValues = {
    values: {},
    secrets: {}
  }
  for (const field of serviceConfigurationFields(definition)) {
    const value = values[field.key]
    if (field.type === 'secret') {
      if (typeof value === 'string' && value.length > 0) {
        stored.secrets[field.key] = encryptStoredSecret(
          value,
          'service-configuration'
        )
      }
    } else if (value !== undefined) {
      stored.values[field.key] = value
    }
  }
  return stored
}

async function configurationPlaintext(
  definition: ServiceConfigurationDefinition,
  stored: StoredServiceConfigurationValues
) {
  return reconstructConfiguration({
    definition,
    stored,
    valueUpdates: {},
    secretUpdates: {}
  })
}

export const platformServiceControlService = {
  async get(upstreamServiceId: string) {
    return buildView(await loadControlContext(upstreamServiceId))
  },

  async discover(upstreamServiceId: string) {
    const context = await loadControlContext(upstreamServiceId)
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
      lastError: safeControlError(entry.result.reason),
      lastConfigurationSyncAt: new Date(),
      updatedAt: new Date()
    }).where(eq(upstreamTargets.id, entry.target.id))))
    if (failed.length > 0) {
      const error = failed[0]!.result.reason
      await db.update(upstreamServiceConnections).set({
        lastDiscoveryError: safeControlError(error),
        updatedAt: new Date()
      }).where(eq(
        upstreamServiceConnections.upstreamServiceId,
        upstreamServiceId
      ))
      throw createApplicationError({
        statusCode: 502,
        message: `one or more Service targets could not be discovered: ${safeControlError(error)}`,
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
    const first = discovered[0]!
    const openapi = await serviceControlClient.getOpenAPI(
      first.target.baseUrl,
      description.openapi,
      token
    )
    await persistOpenAPI({
      context,
      description,
      document: openapi.data,
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
    return buildView(await loadControlContext(upstreamServiceId))
  },

  async updateConfiguration(
    upstreamServiceId: string,
    input: {
      expectedRevision: number
      values: Record<string, unknown>
      secrets: Record<string, string | null>
    }
  ) {
    const context = await loadControlContext(upstreamServiceId)
    const definition = context.connection.configurationSchema
    const schemaSha256 = context.connection.configurationSchemaSha256
    if (!definition || !schemaSha256) {
      throw createApplicationError({
        statusCode: 409,
        message: 'discover the Service before editing configuration',
        data: { code: 'SERVICE_NOT_DISCOVERED' }
      })
    }
    if (context.connection.configurationRevision !== input.expectedRevision) {
      throw createApplicationError({
        statusCode: 409,
        message: 'Service configuration was changed by another administrator',
        data: {
          code: 'SERVICE_CONFIGURATION_REVISION_CONFLICT',
          currentRevision: context.connection.configurationRevision
        }
      })
    }

    let values: Record<string, ServiceConfigurationValue>
    try {
      values = reconstructConfiguration({
        definition,
        stored: context.connection.configurationValues,
        valueUpdates: input.values,
        secretUpdates: input.secrets
      })
    } catch (error) {
      if (error instanceof ServiceConfigurationValueError) {
        throw createApplicationError({
          statusCode: 400,
          message: error.message,
          data: { code: 'SERVICE_CONFIGURATION_INVALID', field: error.field }
        })
      }
      throw error
    }
    const revision = context.connection.configurationRevision + 1
    const configurationHash = calculateServiceConfigurationHash(
      schemaSha256,
      values
    )
    const stored = storeConfigurationValues(definition, values)
    const updated = firstRow(await db.update(upstreamServiceConnections)
      .set({
        configurationValues: stored,
        configurationRevision: revision,
        configurationHash,
        updatedAt: new Date()
      })
      .where(and(
        eq(
          upstreamServiceConnections.upstreamServiceId,
          upstreamServiceId
        ),
        eq(
          upstreamServiceConnections.configurationRevision,
          input.expectedRevision
        )
      ))
      .returning())
    if (!updated) {
      throw createApplicationError({
        statusCode: 409,
        message: 'Service configuration was changed by another administrator',
        data: { code: 'SERVICE_CONFIGURATION_REVISION_CONFLICT' }
      })
    }
    await db.update(upstreamTargets).set({
      configurationStatus: 'unknown',
      updatedAt: new Date()
    }).where(and(
      eq(upstreamTargets.upstreamServiceId, upstreamServiceId),
      eq(upstreamTargets.enabled, true)
    ))
    return pushConfiguration(
      { ...context, connection: updated },
      revision,
      values,
      configurationHash
    )
  },

  async synchronizeConfiguration(upstreamServiceId: string) {
    const context = await loadControlContext(upstreamServiceId)
    const definition = context.connection.configurationSchema
    const schemaSha256 = context.connection.configurationSchemaSha256
    if (
      !definition
      || !schemaSha256
      || context.connection.configurationRevision < 1
      || !context.connection.configurationHash
    ) {
      throw createApplicationError({
        statusCode: 409,
        message: 'save a Service configuration before synchronizing it',
        data: { code: 'SERVICE_CONFIGURATION_NOT_SAVED' }
      })
    }
    const values = await configurationPlaintext(
      definition,
      context.connection.configurationValues
    )
    const configurationHash = calculateServiceConfigurationHash(
      schemaSha256,
      values
    )
    if (configurationHash !== context.connection.configurationHash) {
      throw createApplicationError({
        statusCode: 500,
        message: 'stored Service configuration fingerprint is invalid',
        data: { code: 'SERVICE_CONFIGURATION_STORAGE_INVALID' }
      })
    }
    return pushConfiguration(
      context,
      context.connection.configurationRevision,
      values,
      configurationHash
    )
  }
}
