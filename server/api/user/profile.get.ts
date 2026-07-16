// 当前用户的可编辑资料（含 displayName）。me.get.ts 只返回登录态摘要，
// profile 页需要额外字段
import { createError } from 'h3'
import { usersService } from '~~/server/services/user-service'
import { defineAuthenticatedEventHandler } from '~~/server/utils/auth'

export default defineAuthenticatedEventHandler(async (_event, authUser) => {
  const row = await usersService.getById(authUser.id)
  if (!row) {
    throw createError({ statusCode: 404, message: '用户不存在' })
  }
  const { passwordHash: _ph, ...safe } = row
  return {
    ...safe,
    avatarUrl: authUser.avatarUrl
  }
})
