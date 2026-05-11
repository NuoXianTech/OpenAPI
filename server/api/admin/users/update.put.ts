import type { H3Event } from 'h3'
import { createError } from 'h3'
import { usersService } from '~~/server/service/userService'
import { requireAdmin } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)
  const body = await readBody(event) as Record<string, unknown>
  const id = Number(body.id)
  if (!id) {
    throw createError({ statusCode: 400, message: 'id is required' })
  }

  const updated = await usersService.updateUser(id, {
    username: body.username !== undefined ? String(body.username).trim() : undefined,
    email: body.email !== undefined ? String(body.email).trim().toLowerCase() : undefined,
    displayName: body.displayName !== undefined ? (String(body.displayName).trim() || null) : undefined,
    isActive: typeof body.isActive === 'boolean' ? body.isActive : undefined,
    isBanned: typeof body.isBanned === 'boolean' ? body.isBanned : undefined,
  })

  return updated
})
