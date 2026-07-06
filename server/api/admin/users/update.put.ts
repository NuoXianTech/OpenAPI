import type { H3Event } from 'h3'
import { createError } from 'h3'
import { adminUpdateUserSchema } from '~~/server/schemas/admin'
import { usersService } from '~~/server/services/user-service'
import { hashPassword, requireAdmin } from '~~/server/utils/auth'
import { operationLogService } from '~~/server/services/operation-log-service'
import { readRequestMeta } from '~~/server/utils/request-meta'
import { readZodBody } from '~~/server/utils/zod'

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const { id, username, email, displayName, isActive, isBanned, password } = await readZodBody(event, adminUpdateUserSchema)

  if (email !== undefined) {
    const existing = await usersService.findByEmail(email)
    if (existing && existing.id !== id) {
      throw createError({ statusCode: 409, message: '该邮箱已被注册' })
    }
  }

  if (username !== undefined) {
    const existing = await usersService.findByUsername(username)
    if (existing && existing.id !== id) {
      throw createError({ statusCode: 409, message: '该用户名已被占用' })
    }
  }

  // 提供 password 才重置；否则 passwordHash 保持 undefined，drizzle 不会触碰该列
  const passwordHash = password ? await hashPassword(password) : undefined

  const updated = await usersService.updateUser(id, {
    username,
    email,
    displayName: displayName !== undefined ? (displayName || null) : undefined,
    isActive,
    isBanned,
    passwordHash
  })
  if (!updated) {
    throw createError({ statusCode: 404, message: 'user not found' })
  }

  // 管理员重置密码后，自增 tokenVersion 令该用户所有已签发 JWT 失效，强制重新登录
  if (password) {
    await usersService.bumpTokenVersion(id)
  }

  await operationLogService.addLog({
    actor: admin.username,
    action: 'admin.user.update',
    resourceType: 'user',
    resourceId: id,
    ...readRequestMeta(event),
    // 仅记录是否改过密码，绝不落明文 / hash
    detail: { patch: { username, email, displayName, isActive, isBanned, passwordChanged: Boolean(password) } }
  })

  const { passwordHash: _ph, ...safe } = updated
  return safe
})
