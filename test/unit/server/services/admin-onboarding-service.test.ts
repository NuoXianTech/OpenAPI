import { describe, expect, it } from 'vitest'
import { assertAdminOnboardingCompleted } from '~~/server/services/admin-onboarding-service'

const BLOCKED_PATH = '/api/admin/v1/products'
const FACTORY_ADMIN = { username: 'admin', email: 'admin@openapi.com' }

function expectBlocked(admin: Parameters<typeof assertAdminOnboardingCompleted>[0]) {
  expect(() => assertAdminOnboardingCompleted(admin, BLOCKED_PATH)).toThrowError(
    expect.objectContaining({
      statusCode: 428,
      data: { code: 'ADMIN_ONBOARDING_REQUIRED' }
    })
  )
}

function expectAllowed(admin: Parameters<typeof assertAdminOnboardingCompleted>[0]) {
  expect(() => assertAdminOnboardingCompleted(admin, BLOCKED_PATH)).not.toThrow()
}

describe('admin onboarding guard', () => {
  it('blocks the factory administrator until the factory password is rotated', () => {
    expectBlocked({ ...FACTORY_ADMIN, tokenVersion: 0 })
  })

  it('allows the onboarding endpoints themselves', () => {
    for (const path of ['/api/admin/onboarding/status', '/api/admin/onboarding/profile']) {
      expect(() => assertAdminOnboardingCompleted(
        { ...FACTORY_ADMIN, tokenVersion: 0 },
        path
      )).not.toThrow()
    }
  })

  it('allows a default username and email once the password is rotated', () => {
    // 用户名与邮箱允许保持出厂值：口令才是凭据边界。
    expectAllowed({ ...FACTORY_ADMIN, tokenVersion: 1 })
  })

  it('never blocks an administrator created by another administrator', () => {
    // 新建的管理员 tokenVersion 默认为 0，但身份由创建者填写、与出厂值无关。
    // 只看口令会把它拦在所有管理端点之外，并要求它去改一个它从来没有过的出厂密码。
    expectAllowed({ username: 'alice', email: 'alice@example.com', tokenVersion: 0 })
  })

  it('still blocks when only one factory identity field remains', () => {
    // 出厂邮箱未改：仍是出厂账号，口令未轮换就必须继续拦。
    expectBlocked({ username: 'owner', email: 'admin@openapi.com', tokenVersion: 0 })
    expectBlocked({ username: 'admin', email: 'owner@example.com', tokenVersion: 0 })
  })

  it('does not treat an identity change alone as completion', () => {
    // 改掉一半身份但不轮换口令，启动日志里那个一次性口令仍然有效。
    expectBlocked({ username: 'admin', email: 'owner@example.com', tokenVersion: 0 })
  })

  it('treats a missing tokenVersion as not yet rotated', () => {
    expectBlocked({ ...FACTORY_ADMIN })
  })

  it('ignores case and surrounding whitespace when matching factory identities', () => {
    expectBlocked({ username: '  ADMIN  ', email: 'someone@example.com', tokenVersion: 0 })
  })
})
