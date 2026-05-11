// 用户更新自己的非敏感资料：displayName
import type { H3Event } from 'h3'
import { createError } from 'h3'
import { userUpdateProfileSchema } from '#shared/schemas/user'
import { usersService } from '~~/server/service/userService'
import { requireAuth } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineEventHandler(async (event: H3Event) => {
  const authUser = await requireAuth(event)
  const { displayName } = await readZodBody(event, userUpdateProfileSchema)

  const updated = await usersService.updateUser(authUser.id, {
    displayName: displayName || null,
  })
  if (!updated) {
    throw createError({ statusCode: 404, message: '用户不存在' })
  }

  const { passwordHash: _ph, ...safe } = updated
  return safe
})
