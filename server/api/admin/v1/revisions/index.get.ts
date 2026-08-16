import { z } from 'zod'
import { getQuery } from 'h3'
import { routingRevisionService } from '~~/server/services/routing-revision-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'

const optionalEnvironmentId = z.uuid().optional()

export default defineAdminEventHandler((event) => {
  const parsed = optionalEnvironmentId.safeParse(getQuery(event).environmentId)
  return routingRevisionService.list(parsed.success ? parsed.data : undefined)
})
