import { beforeEach, describe, expect, it, vi } from 'vitest'

const operationLogs = vi.hoisted(() => ({
  list: vi.fn()
}))

vi.mock('~~/server/services/operation-log-service', () => ({
  operationLogService: operationLogs
}))

const { assertAdminOnboardingCompleted } = await import(
  '~~/server/services/admin-onboarding-service'
)

beforeEach(() => {
  operationLogs.list.mockReset()
  operationLogs.list.mockResolvedValue({ items: [], total: 0 })
})

describe('admin onboarding guard', () => {
  it('blocks every other admin endpoint until both default identities change', async () => {
    await expect(assertAdminOnboardingCompleted({
      id: 1,
      username: 'admin',
      email: 'owner@example.com'
    }, '/api/admin/v1/products')).rejects.toMatchObject({
      statusCode: 428,
      data: { code: 'ADMIN_ONBOARDING_REQUIRED' }
    })
    await expect(assertAdminOnboardingCompleted({
      id: 1,
      username: 'owner',
      email: 'admin@openapi.com'
    }, '/api/admin/v1/products')).rejects.toMatchObject({
      statusCode: 428,
      data: { code: 'ADMIN_ONBOARDING_REQUIRED' }
    })
    expect(operationLogs.list).toHaveBeenCalledTimes(2)
  })

  it('allows onboarding endpoints and a fully changed profile', async () => {
    await expect(assertAdminOnboardingCompleted({
      id: 1,
      username: 'admin',
      email: 'admin@openapi.com'
    }, '/api/admin/onboarding/profile')).resolves.toBeUndefined()
    await expect(assertAdminOnboardingCompleted({
      id: 1,
      username: 'owner',
      email: 'owner@example.com'
    }, '/api/admin/v1/products')).resolves.toBeUndefined()
    expect(operationLogs.list).not.toHaveBeenCalled()
  })

  it('accepts a legacy administrator that already completed onboarding', async () => {
    operationLogs.list.mockResolvedValue({ items: [{}], total: 1 })

    await expect(assertAdminOnboardingCompleted({
      id: 1,
      username: 'admin',
      email: 'admin@openapi.com'
    }, '/api/admin/v1/products')).resolves.toBeUndefined()
  })
})
