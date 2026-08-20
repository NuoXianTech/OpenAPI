import { platformServiceControlService } from '~~/server/services/platform-service-control-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readUuidRouterParam } from '~~/server/utils/router-param'

export default defineAdminEventHandler((event) => {
  const upstreamId = readUuidRouterParam(event)
  return platformServiceControlService.get(
    upstreamId,
    { checkAvailability: true }
  )
})
