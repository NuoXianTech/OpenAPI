import { createError } from 'h3'
import { z } from 'zod'
import {
  isApiCapabilityConfigError,
  maskApiCapabilitySecrets,
  saveApiCapabilityConfig
} from '~~/server/lib/api-capabilities/config-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'
import { nonNegativeInt, requiredString } from '~~/server/schemas/validation'
import { operationLogService } from '~~/server/services/operation-log-service'
import { getApiCapabilityDefinition } from '~~/server/lib/api-capabilities/definition-registry'

const updateApiCapabilitiesSchema = z.object({
  pathVersion: requiredString('接口版本'),
  code: requiredString('接口标识'),
  revision: nonNegativeInt('配置版本'),
  values: z.record(z.string(), z.unknown())
})

export default defineAdminEventHandler(async (event, admin) => {
  const body = await readZodBody(event, updateApiCapabilitiesSchema)

  try {
    const config = await saveApiCapabilityConfig(
      body.pathVersion,
      body.code,
      body.revision,
      body.values,
      admin.id || null
    )
    await operationLogService.addRequestLog(event, {
      userId: admin.id || null,
      actor: admin.username,
      action: 'admin.api.capabilities.update',
      resourceType: 'api',
      resourceId: `${body.pathVersion}:${body.code}`,
      detail: {
        pathVersion: body.pathVersion,
        code: body.code,
        previousRevision: body.revision,
        revision: config.revision,
        changedKeys: Object.keys(body.values).sort()
      }
    })
    const definition = getApiCapabilityDefinition(body.pathVersion, body.code)
    return definition ? maskApiCapabilitySecrets(definition, config) : config
  } catch (error) {
    if (isApiCapabilityConfigError(error)) {
      throw createError({ statusCode: error.statusCode, message: error.message })
    }
    throw error
  }
})
