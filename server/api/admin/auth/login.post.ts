import type { H3Event } from 'h3'
import { createError } from 'h3'
import { createAdminSession } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  const body = await readBody(event) as Record<string, any>
  const username = (body.username || '').toString().trim()
  const password = (body.password || '').toString()

  const authConfig = useRuntimeConfig().auth
  if (!authConfig.adminPassword) {
    throw createError({ statusCode: 500, message: 'Admin password is not configured' })
  }

  if (username !== authConfig.adminUsername || password !== authConfig.adminPassword) {
    throw createError({ statusCode: 401, message: 'Invalid admin credentials' })
  }

  await createAdminSession(event)

  return {
    code: 0,
    msg: 'ok',
    data: {
      id: 0,
      username: authConfig.adminUsername,
      email: authConfig.adminEmail,
      role: 'admin',
    },
  }
})
