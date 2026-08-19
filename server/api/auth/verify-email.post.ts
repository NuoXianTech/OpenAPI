// POST prevents mail scanners and browser prefetching from activating accounts.
import { createError } from 'h3'
import { verifyEmailSchema } from '~~/server/schemas/auth'
import { userService } from '~~/server/services/user-service'
import { createUserSession } from '~~/server/utils/auth'
import { verifyVerificationToken } from '~~/server/utils/verification-token'
import { readZodBody } from '~~/server/utils/zod'

export default defineEventHandler(async (event) => {
  const { userId, token } = await readZodBody(event, verifyEmailSchema)
  const user = await userService.getById(userId)
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

  const updated = await userService.activateUser(userId)
  if (!updated) {
    const current = await userService.getById(userId)
    if (current?.emailVerifiedAt) return { alreadyVerified: true }
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  await createUserSession(event, { id: updated.id, role: 'user' })
  const { passwordHash: _, ...safe } = updated
  return { alreadyVerified: false, user: safe }
})
