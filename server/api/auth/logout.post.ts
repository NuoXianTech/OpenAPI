import type { H3Event } from 'h3'
import { destroyCurrentSession } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  await destroyCurrentSession(event)
  return null
})
