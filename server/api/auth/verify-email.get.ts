import type { H3Event } from 'h3'
import { createError, getQuery } from 'h3'
import { verifyVerificationToken } from '~~/server/utils/verification-token'
import { usersService } from '~~/server/services/user-service'
import { createUserSession } from '~~/server/utils/auth'
import { readQueryNumber, readQueryString } from '~~/server/utils/request-query'

export default defineEventHandler(async (event: H3Event) => {
  const query = getQuery(event)
  const userId = readQueryNumber(query.user)
  const token = readQueryString(query.token)

  if (!userId || !token) {
    throw createError({ statusCode: 400, message: 'Invalid verification link' })
  }

  const user = await usersService.getById(userId)
  if (!user) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  const tokenPayload = verifyVerificationToken(token, user, 'verify')
  if (!tokenPayload || tokenPayload.email !== user.email) {
    throw createError({ statusCode: 400, message: 'Verification link expired or invalid' })
  }

  if (user.emailVerifiedAt) {
    return { alreadyVerified: true }
  }

  const updated = await usersService.activateUser(userId)
  if (!updated) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  await createUserSession(event, {
    id: updated.id,
    kind: 'user'
  })

  const { passwordHash: _, ...safe } = updated
  return { alreadyVerified: false, user: safe }
})
