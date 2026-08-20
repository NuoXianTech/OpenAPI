import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  activateUser: vi.fn(),
  deletePendingUser: vi.fn(),
  issueVerificationTokenUrl: vi.fn(),
  sendVerificationEmail: vi.fn()
}))

vi.mock('~~/server/services/user-service', () => ({
  userService: {
    activateUser: mocks.activateUser,
    deletePendingUser: mocks.deletePendingUser
  }
}))

vi.mock('~~/server/utils/email', () => ({
  sendVerificationEmail: mocks.sendVerificationEmail
}))

vi.mock('~~/server/utils/verification-token', () => ({
  issueVerificationTokenUrl: mocks.issueVerificationTokenUrl
}))

const { registrationService } = await import('~~/server/services/registration-service')

const user = {
  id: 42,
  email: 'developer@example.com',
  tokenVersion: 3
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.activateUser.mockResolvedValue({ id: user.id })
  mocks.issueVerificationTokenUrl.mockReturnValue('https://example.com/verify-email?token=token')
})

describe('registration service', () => {
  it('activates the user immediately when email verification is disabled', async () => {
    await expect(registrationService.completeRegistration({
      user,
      settings: {
        emailActivationEnabled: false,
        emailVerifyExpiresInMinutes: 30,
        siteUrl: 'https://example.com'
      },
      reasonPrefix: 'password registration'
    })).resolves.toEqual({ verificationRequired: false })

    expect(mocks.activateUser).toHaveBeenCalledWith(user.id)
    expect(mocks.issueVerificationTokenUrl).not.toHaveBeenCalled()
    expect(mocks.sendVerificationEmail).not.toHaveBeenCalled()
    expect(mocks.deletePendingUser).not.toHaveBeenCalled()
  })

  it('rolls back the new user when immediate activation fails', async () => {
    mocks.activateUser.mockRejectedValueOnce(new Error('database unavailable'))

    await expect(registrationService.completeRegistration({
      user,
      settings: {
        emailActivationEnabled: false,
        emailVerifyExpiresInMinutes: 30,
        siteUrl: 'https://example.com'
      },
      reasonPrefix: 'password registration'
    })).rejects.toMatchObject({
      statusCode: 503,
      message: '注册失败，请稍后重试或联系管理员'
    })

    expect(mocks.deletePendingUser).toHaveBeenCalledWith(user.id)
  })

  it('sends a verification email when activation is required', async () => {
    await expect(registrationService.completeRegistration({
      user,
      settings: {
        emailActivationEnabled: true,
        emailVerifyExpiresInMinutes: 45,
        siteUrl: 'https://example.com'
      },
      reasonPrefix: 'oauth registration'
    })).resolves.toEqual({ verificationRequired: true })

    expect(mocks.issueVerificationTokenUrl).toHaveBeenCalledWith(user, {
      siteUrl: 'https://example.com',
      path: 'verify-email',
      purpose: 'verify',
      email: user.email,
      expiresInMinutes: 45
    })
    expect(mocks.sendVerificationEmail).toHaveBeenCalledWith(
      user.email,
      'https://example.com/verify-email?token=token'
    )
    expect(mocks.activateUser).not.toHaveBeenCalled()
    expect(mocks.deletePendingUser).not.toHaveBeenCalled()
  })

  it('rolls back the new user when the verification email cannot be sent', async () => {
    mocks.sendVerificationEmail.mockRejectedValueOnce(new Error('smtp unavailable'))

    await expect(registrationService.completeRegistration({
      user,
      settings: {
        emailActivationEnabled: true,
        emailVerifyExpiresInMinutes: 30,
        siteUrl: 'https://example.com'
      },
      reasonPrefix: 'oauth registration'
    })).rejects.toMatchObject({
      statusCode: 503,
      message: '验证邮件发送失败，请稍后重试或联系管理员检查邮件服务配置'
    })

    expect(mocks.deletePendingUser).toHaveBeenCalledWith(user.id)
  })

  it('rolls back the new user when a verification token cannot be issued', async () => {
    mocks.issueVerificationTokenUrl.mockImplementationOnce(() => {
      throw new Error('auth secret unavailable')
    })

    await expect(registrationService.completeRegistration({
      user,
      settings: {
        emailActivationEnabled: true,
        emailVerifyExpiresInMinutes: 30,
        siteUrl: 'https://example.com'
      },
      reasonPrefix: 'password registration'
    })).rejects.toMatchObject({ statusCode: 503 })

    expect(mocks.sendVerificationEmail).not.toHaveBeenCalled()
    expect(mocks.deletePendingUser).toHaveBeenCalledWith(user.id)
  })
})
