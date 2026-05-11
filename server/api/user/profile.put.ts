// 用户更新自己的非敏感资料：displayName
import type { H3Event } from 'h3'
import { createError, readBody } from 'h3'
import { usersService } from '~~/server/service/userService'
import { requireAuth } from '~~/server/utils/auth'

const DISPLAY_NAME_MAX = 100

export default defineEventHandler(async (event: H3Event) => {
  const authUser = await requireAuth(event)
  const body = await readBody(event) as Record<string, unknown>

  const update: { displayName?: string | null } = {}

  if (Object.prototype.hasOwnProperty.call(body, 'displayName')) {
    const v = String(body.displayName ?? '').trim()
    if (v.length > DISPLAY_NAME_MAX) {
      throw createError({ statusCode: 400, message: `显示名最多 ${DISPLAY_NAME_MAX} 字` })
    }
    update.displayName = v || null
  }

  if (Object.keys(update).length === 0) {
    throw createError({ statusCode: 400, message: '没有可更新的字段' })
  }

  const updated = await usersService.updateUser(authUser.id, update)
  if (!updated) {
    throw createError({ statusCode: 404, message: '用户不存在' })
  }

  const { passwordHash: _ph, ...safe } = updated
  return safe
})
