import type { H3Event } from 'h3'
import { createError, getQuery } from 'h3'
import { emailVerificationService } from '~~/server/service/emailVerificationService'
import { usersService } from '~~/server/service/userService'
import { createAuthToken, setAuthCookie } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  const query = getQuery(event)
  const userId = Number(query.user || 0)
  const token = (query.token || '').toString()

  if (!userId || !token) {
    throw createError({ statusCode: 400, message: 'Invalid verification link' })
  }

  const tokenRecord = await emailVerificationService.consumeToken(userId, token)
  if (!tokenRecord) {
    throw createError({ statusCode: 400, message: 'Verification link expired or invalid' })
  }

  const updated = await usersService.activateUser(userId)
  if (!updated) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  const { token: authToken, expiresInSeconds } = createAuthToken({
    id: updated.id,
    username: updated.username,
    email: updated.email,
    role: updated.role,
  })
  setAuthCookie(event, authToken, expiresInSeconds)

  const { passwordHash: _, ...safe } = updated

  return {
    code: 0,
    msg: 'ok',
    data: safe,
  }
})
