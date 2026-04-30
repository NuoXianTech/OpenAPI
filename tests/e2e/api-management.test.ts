import { describe, expect, it } from 'vitest'
import { createAdminClient, loginAsAdmin, type ApiResponse } from './helpers/admin-client'
import { setupE2E } from './helpers/setup'

await setupE2E()

interface AdminApiItem {
  id: number
  code: string
  pathVersion: string
  name: string
  isEnabled: boolean
}

interface DiscoverPayload {
  versions: Array<{
    pathVersion: string
    apis: Array<{
      pathVersion: string
      code: string
      registered: AdminApiItem | null
    }>
  }>
}

const TEST_PATH_VERSION = 'v1'
const TEST_CODE = 'test'

function findDiscovered(payload: DiscoverPayload, pathVersion: string, code: string) {
  for (const v of payload.versions) {
    for (const api of v.apis) {
      if (api.pathVersion === pathVersion && api.code === code) return api
    }
  }
  return null
}

describe('admin apis e2e', () => {
  it('registers, updates, and deletes registration via discovery', async () => {
    const sessionCookie = await loginAsAdmin()
    const adminClient = createAdminClient(sessionCookie)

    // 清理：若已登记，先删
    const before = await adminClient.get<DiscoverPayload>('/api/admin/apis/discover')
    expect(before.code).toBe(0)
    const existing = findDiscovered(before.data, TEST_PATH_VERSION, TEST_CODE)
    expect(existing, `manifest 必须包含 ${TEST_PATH_VERSION}/${TEST_CODE}`).not.toBeNull()
    if (existing?.registered) {
      await adminClient.post('/api/admin/apis/delete', { id: existing.registered.id })
    }

    // 登记
    const registered = await adminClient.post<AdminApiItem>('/api/admin/apis/register', {
      pathVersion: TEST_PATH_VERSION,
      code: TEST_CODE,
      overrides: { name: 'E2E Test Endpoint', isEnabled: true },
    })
    expect(registered.code).toBe(0)
    expect(registered.data.code).toBe(TEST_CODE)
    const apiId = registered.data.id
    expect(apiId).toBeGreaterThan(0)

    // 验证 discover 显示已登记
    const afterRegister = await adminClient.get<DiscoverPayload>('/api/admin/apis/discover')
    const afterRow = findDiscovered(afterRegister.data, TEST_PATH_VERSION, TEST_CODE)
    expect(afterRow?.registered?.id).toBe(apiId)
    expect(afterRow?.registered?.isEnabled).toBe(true)

    // 编辑（停用）
    const updated = await adminClient.put<AdminApiItem>('/api/admin/apis/update', {
      id: apiId,
      isEnabled: false,
    })
    expect(updated.code).toBe(0)
    expect(updated.data.isEnabled).toBe(false)

    // 删除登记
    const deleted = await adminClient.post<AdminApiItem>('/api/admin/apis/delete', { id: apiId })
    expect(deleted.code).toBe(0)
    expect(deleted.data.id).toBe(apiId)

    const afterDelete = await adminClient.get<DiscoverPayload>('/api/admin/apis/discover')
    const afterDeleteRow = findDiscovered(afterDelete.data, TEST_PATH_VERSION, TEST_CODE)
    expect(afterDeleteRow?.registered).toBeNull()
  })

  it('rejects register when manifest does not contain the code', async () => {
    const sessionCookie = await loginAsAdmin()
    const adminClient = createAdminClient(sessionCookie)

    const response = await adminClient.raw<ApiResponse<unknown>>('/api/admin/apis/register', {
      method: 'POST',
      ignoreResponseError: true,
      body: {
        pathVersion: 'v1',
        code: '__definitely_not_a_real_code__',
      },
    })

    expect(response.status).toBe(404)
  })
})
