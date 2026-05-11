import type { H3Event } from 'h3'
import { adminUpdateUserSchema } from '#shared/schemas/admin'
import { usersService } from '~~/server/service/userService'
import { requireAdmin } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)
  const { id, username, email, displayName, isActive, isBanned } = await readZodBody(event, adminUpdateUserSchema)

  const updated = await usersService.updateUser(id, {
    username,
    email,
    displayName: displayName !== undefined ? (displayName || null) : undefined,
    isActive,
    isBanned,
  })

  return updated
})
