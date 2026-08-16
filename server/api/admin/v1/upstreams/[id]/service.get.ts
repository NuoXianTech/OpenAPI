import { createError, getRouterParam } from 'h3'
import { z } from 'zod'
import { platformServiceControlService } from '~~/server/services/platform-service-control-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'

export default defineAdminEventHandler((event) => {
  const upstreamId = z.uuid().safeParse(getRouterParam(event, 'id'))
  if (!upstreamId.success) {
    throw createError({ statusCode: 400, message: 'upstream id is invalid' })
  }
  return platformServiceControlService.get(upstreamId.data)
})
