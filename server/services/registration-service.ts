import type { SystemSettings } from '#shared/types/site-settings'
import { userService } from '~~/server/services/user-service'
import { createApplicationError } from '~~/server/errors/application-error'
import { sendVerificationEmail } from '~~/server/utils/email'
import { issueVerificationTokenUrl } from '~~/server/utils/verification-token'

interface PendingRegistrationUser {
  id: number
  email: string
  tokenVersion: number
}

type RegistrationCompletionSettings = Pick<
  SystemSettings,
  'emailActivationEnabled' | 'emailVerifyExpiresInMinutes' | 'siteUrl'
>

interface CompleteRegistrationInput {
  user: PendingRegistrationUser
  settings: RegistrationCompletionSettings
  reasonPrefix: string
}

async function rollbackCreatedUser(userId: number, reason: string, error: unknown): Promise<void> {
  console.error(`[registration] ${reason}, rolling back user`, { userId, error })
  try {
    await userService.deletePendingUser(userId)
  } catch (rollbackError) {
    console.error('[registration] rollback failed', { userId, error: rollbackError })
  }
}

async function completeRegistration(input: CompleteRegistrationInput): Promise<{ verificationRequired: boolean }> {
  const { user, settings, reasonPrefix } = input
  const verificationRequired = settings.emailActivationEnabled !== false

  if (!verificationRequired) {
    try {
      const activated = await userService.activateUser(user.id)
      if (!activated) throw new Error('registration user could not be activated')
    } catch (error) {
      await rollbackCreatedUser(user.id, `${reasonPrefix} auto-activation failed`, error)
      throw createApplicationError({
        statusCode: 503,
        message: '注册失败，请稍后重试或联系管理员'
      })
    }
    return { verificationRequired }
  }

  try {
    const verifyUrl = issueVerificationTokenUrl(user, {
      siteUrl: settings.siteUrl,
      path: 'verify-email',
      purpose: 'verify',
      email: user.email,
      expiresInMinutes: Number(settings.emailVerifyExpiresInMinutes || 30)
    })
    await sendVerificationEmail(user.email, verifyUrl)
  } catch (error) {
    await rollbackCreatedUser(user.id, `${reasonPrefix} verification email failed`, error)
    throw createApplicationError({
      statusCode: 503,
      message: '验证邮件发送失败，请稍后重试或联系管理员检查邮件服务配置'
    })
  }
  return { verificationRequired }
}

export const registrationService = {
  rollbackCreatedUser,
  completeRegistration
}
