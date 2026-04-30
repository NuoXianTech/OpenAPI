import type { H3Event } from 'h3'
import { createError } from 'h3'
import { apiCallService } from '~~/server/service/apiCallService'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  const user = await requireAuth(event)
  if (!user.id) throw createError({ statusCode: 403, message: 'admin cannot access user call summary' })

  const data = await apiCallService.getSummaryForUser(user.id)
  return { code: 0, msg: 'ok', data }
})
