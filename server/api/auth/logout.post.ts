import type { H3Event } from 'h3'
import { clearAuthCookie } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  clearAuthCookie(event)
  return {
    code: 0,
    msg: 'ok',
    data: null,
  }
})
