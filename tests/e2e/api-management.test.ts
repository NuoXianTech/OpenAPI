import { describe, expect, it } from 'vitest'
import { createAdminClient, loginAsAdmin, type ApiResponse } from './helpers/admin-client'
import { createApiPayload } from './helpers/fixtures'
import { setupE2E } from './helpers/setup'

await setupE2E()

interface AdminApiItem {
  id: number
  code: string
  name: string
}

describe('admin apis e2e', () => {
  it('adds and deletes an api entry', async () => {
    const sessionCookie = await loginAsAdmin()
    const adminClient = createAdminClient(sessionCookie)
    const payload = createApiPayload()

    const created = await adminClient.post<AdminApiItem>('/api/admin/apis/add', payload)
    expect(created.code).toBe(0)
    expect(created.data.code).toBe(payload.code)

    const listAfterCreate = await adminClient.get<AdminApiItem[]>('/api/admin/apis/list', {
      keyword: payload.code,
    })
    expect(listAfterCreate.code).toBe(0)
    expect(listAfterCreate.data.some(item => item.id === created.data.id)).toBe(true)

    const deleted = await adminClient.post<AdminApiItem>('/api/admin/apis/delete', {
      id: created.data.id,
    })
    expect(deleted.code).toBe(0)
    expect(deleted.data.id).toBe(created.data.id)

    const listAfterDelete = await adminClient.get<AdminApiItem[]>('/api/admin/apis/list', {
      keyword: payload.code,
    })
    expect(listAfterDelete.code).toBe(0)
    expect(listAfterDelete.data.some(item => item.id === created.data.id)).toBe(false)
  })

  it('rejects add api when required fields are missing', async () => {
    const sessionCookie = await loginAsAdmin()
    const adminClient = createAdminClient(sessionCookie)

    const response = await adminClient.raw<ApiResponse<unknown>>('/api/admin/apis/add', {
      method: 'POST',
      ignoreResponseError: true,
      body: {
        code: '',
      },
    })

    expect(response.status).toBe(400)
  })
})
