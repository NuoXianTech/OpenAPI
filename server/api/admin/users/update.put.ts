import type { H3Event } from 'h3'
import { createError } from 'h3'
import { usersService } from '~~/server/service/userService'
import { requireAdmin } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)
  const body = await readBody(event) as Record<string, any>
  const id = Number(body.id)
  if (!id) {
    throw createError({ statusCode: 400, message: 'id is required' })
  }

  const updated = await usersService.updateUser(id, {
    username: body.username?.toString().trim(),
    email: body.email?.toString().trim().toLowerCase(),
    displayName: body.displayName?.toString().trim() || null,
    isActive: typeof body.isActive === 'boolean' ? body.isActive : undefined,
    isBanned: typeof body.isBanned === 'boolean' ? body.isBanned : undefined,
  })

  return updated
})
