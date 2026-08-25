// POST prevents mail scanners and browser prefetching from activating accounts.
import { createError } from 'h3'
import { verifyEmailSchema } from '~~/server/schemas/auth'
import { userService } from '~~/server/services/user-service'
import { createUserSession } from '~~/server/utils/auth'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { verifyVerificationToken } from '~~/server/utils/verification-token'
import { readZodBody } from '~~/server/utils/zod'
import { toAuthUser } from '~~/server/utils/user-view'

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

  // 账号生命周期起点：记录激活本身。
  //
  // 这里刻意不写登录日志，尽管验证通过后确实建立了会话：LoginMethod 只有
  // password / oauth_github / oauth_qq 三个取值，任选其一都会在后台显示成一次
  // 「密码登录」，而用户在这个请求里没有输入任何密码——伪造一条登录方式比
  // 漏记一次会话创建更糟。要补的正解是给 LoginMethod 增加 email_verification
  // 取值，那会牵动共享类型、筛选项与两份 i18n，不在审计补全的范围内。
  await addRequestOperationLog(event, {
    userId: updated.id,
    actor: updated.username,
    action: 'user.email.verify',
    resourceType: 'user',
    resourceId: updated.id
  })

  await createUserSession(event, { id: updated.id, role: 'user' })
  return { alreadyVerified: false, user: toAuthUser(updated) }
})
