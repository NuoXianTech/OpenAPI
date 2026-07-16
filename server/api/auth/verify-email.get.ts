import { createError, getQuery } from 'h3'
import { verifyVerificationToken } from '~~/server/utils/verification-token'
import { usersService } from '~~/server/services/user-service'
import { createUserSession } from '~~/server/utils/auth'
import { readQueryString, readRequiredQueryNumber } from '~~/server/utils/request-query'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const userId = readRequiredQueryNumber(query, 'user', 'Invalid verification link')
  const token = readQueryString(query.token)

  if (!token) {
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
    role: 'user'
  })

  const { passwordHash: _, ...safe } = updated
  return { alreadyVerified: false, user: safe }
})
