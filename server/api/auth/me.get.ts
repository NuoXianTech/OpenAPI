import type { H3Event } from 'h3'
import { getAuthUser } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  const user = await getAuthUser(event)
  if (!user) {
    return {
      code: 401,
      msg: 'unauthorized',
      data: null,
    }
  }

  return {
    code: 0,
    msg: 'ok',
    data: user,
  }
})
