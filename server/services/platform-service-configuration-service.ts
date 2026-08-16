import { and, eq } from 'drizzle-orm'
import type {
  RedactedServiceConfigurationState,
  ServiceConfigurationDefinition,
  ServiceConfigurationSyncResult,
  ServiceConfigurationValue,
  StoredServiceConfigurationValues
} from '#shared/types/service-control'
import { db } from '~~/server/db/client'
import {
  upstreamServiceConnections,
  upstreamTargets
} from '~~/server/db/schema'
import { createApplicationError } from '~~/server/errors/application-error'
import {
  type PlatformServiceControlContext,
  loadServiceControlContext,
  safeServiceControlError,
  serviceTargetControlState
} from '~~/server/services/platform-service-control-context'
import { upstreamServiceTokenService } from '~~/server/services/upstream-service-token-service'
import { serviceControlClient } from '~~/server/utils/service-control-client'
import {
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

async function pushConfiguration(
  context: PlatformServiceControlContext,
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
        && response.data.revision === revision
        && response.data.configurationSha256 === configurationHash
      const state = redactedStateFromValues({
        serviceId: response.data.serviceId,
        schemaSha256: response.data.schemaSha256,
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
        lastError: safeServiceControlError(error),
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
  const refreshed = await loadServiceControlContext(context.service.id)
  return {
    status,
    revision,
    configurationHash,
    targets: refreshed.targets.map(serviceTargetControlState)
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

export async function updatePlatformServiceConfiguration(
  upstreamServiceId: string,
  input: {
    expectedRevision: number
    values: Record<string, unknown>
    secrets: Record<string, string | null>
  }
) {
  const context = await loadServiceControlContext(upstreamServiceId)
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
}

export async function synchronizePlatformServiceConfiguration(
  upstreamServiceId: string
) {
  const context = await loadServiceControlContext(upstreamServiceId)
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
  const values = reconstructConfiguration({
    definition,
    stored: context.connection.configurationValues,
    valueUpdates: {},
    secretUpdates: {}
  })
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
