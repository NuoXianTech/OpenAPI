import { destroyCurrentSession } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  await destroyCurrentSession(event)
  return null
})
