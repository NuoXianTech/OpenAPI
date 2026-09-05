import { destroyCurrentSession } from '~~/server/utils/auth'
import { assertSameOriginMutation } from '~~/server/utils/csrf'

export default defineEventHandler(async (event) => {
  assertSameOriginMutation(event)
  destroyCurrentSession(event)
  return null
})
