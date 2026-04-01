import { describe, expect, it } from 'vitest'
import { createAdminClient, loginAsAdmin } from './helpers/admin-client'
import { createFriendLinkPayload } from './helpers/fixtures'
import { setupE2E } from './helpers/setup'

await setupE2E()

interface FriendLinkItem {
  id: number
  title: string
  url: string
}

describe('admin friend links e2e', () => {
  it('adds and deletes a friend link', async () => {
    const sessionCookie = await loginAsAdmin()
    const adminClient = createAdminClient(sessionCookie)
    const payload = createFriendLinkPayload()

    const created = await adminClient.post<FriendLinkItem>('/api/admin/friend-links/add', payload)
    expect(created.code).toBe(0)
    expect(created.data.title).toBe(payload.title)

    const listAfterCreate = await adminClient.get<FriendLinkItem[]>('/api/admin/friend-links/list')
    expect(listAfterCreate.code).toBe(0)
    expect(listAfterCreate.data.some(item => item.id === created.data.id)).toBe(true)

    const deleted = await adminClient.post<FriendLinkItem>('/api/admin/friend-links/delete', {
      id: created.data.id,
    })
    expect(deleted.code).toBe(0)
    expect(deleted.data.id).toBe(created.data.id)

    const listAfterDelete = await adminClient.get<FriendLinkItem[]>('/api/admin/friend-links/list')
    expect(listAfterDelete.code).toBe(0)
    expect(listAfterDelete.data.some(item => item.id === created.data.id)).toBe(false)
  })

  it('rejects add friend link when title or url is missing', async () => {
    const sessionCookie = await loginAsAdmin()
    const adminClient = createAdminClient(sessionCookie)

    const response = await adminClient.raw('/api/admin/friend-links/add', {
      method: 'POST',
      ignoreResponseError: true,
      body: {
        title: 'missing-url',
      },
    })

    expect(response.status).toBe(400)
  })
})
