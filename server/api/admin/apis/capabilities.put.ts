import { createError, type H3Event } from 'h3'
import { z } from 'zod'
import {
  isApiCapabilityConfigError,
  saveApiCapabilityConfig
} from '~~/server/lib/api-capabilities/config-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'
import { nonNegativeInt, requiredString } from '~~/server/schemas/validation'

const updateApiCapabilitiesSchema = z.object({
  pathVersion: requiredString('接口版本'),
  code: requiredString('接口标识'),
  revision: nonNegativeInt('配置版本'),
  values: z.record(z.string(), z.unknown())
})

export default defineAdminEventHandler(async (event: H3Event, admin) => {
  const body = await readZodBody(event, updateApiCapabilitiesSchema)

  try {
    return await saveApiCapabilityConfig(
      body.pathVersion,
      body.code,
      body.revision,
      body.values,
      admin.id || null
    )
  } catch (error) {
    if (isApiCapabilityConfigError(error)) {
      throw createError({ statusCode: error.statusCode, message: error.message })
    }
    throw error
  }
})
