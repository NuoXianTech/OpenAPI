import { createError, getQuery } from 'h3'
import type { AdminApiCapabilityResponse } from '#shared/types/api-capability'
import { getApiCapabilityDefinition } from '~~/server/lib/api-capabilities/definition-registry'
import {
  isApiCapabilityConfigError,
  loadApiCapabilityConfig,
  maskApiCapabilitySecrets
} from '~~/server/lib/api-capabilities/config-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'

function readRequiredQueryValue(value: unknown, label: string): string {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (!normalized) throw createError({ statusCode: 400, message: `${label}不能为空` })
  return normalized
}

export default defineAdminEventHandler(async (event): Promise<AdminApiCapabilityResponse> => {
  const query = getQuery(event)
  const pathVersion = readRequiredQueryValue(query.pathVersion, '接口版本')
  const code = readRequiredQueryValue(query.code, '接口标识')
  const definition = getApiCapabilityDefinition(pathVersion, code)

  if (!definition) {
    throw createError({ statusCode: 404, message: `接口 ${pathVersion}/${code} 未声明业务能力` })
  }

  try {
    const config = await loadApiCapabilityConfig(pathVersion, code)
    return { definition, config: maskApiCapabilitySecrets(definition, config) }
  } catch (error) {
    if (isApiCapabilityConfigError(error)) {
      throw createError({ statusCode: error.statusCode, message: error.message })
    }
    throw error
  }
})
