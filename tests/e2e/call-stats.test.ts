import { afterAll, describe, expect, it } from 'vitest'
import { fetch as e2eFetch } from '@nuxt/test-utils/e2e'
import { createAdminClient, loginAsAdmin } from './helpers/admin-client'
import { waitForValue } from './helpers/wait'
import { setupE2E } from './helpers/setup'
import {
  closeDbClient,
  deleteApiCallStatsByApiId,
  deleteApiCallsByApiId,
} from './helpers/db-cleanup'

await setupE2E()

interface ApiCallStatItem {
  apiListId: number
  totalCount: number
  successCount: number
  failureCount: number
  apiPath: string | null
}

interface ApiCallStatsResponse {
  total: number
  success: number
  failure: number
  items: ApiCallStatItem[]
}

interface AdminApiItem {
  id: number
  code: string
  apiPath: string
}

afterAll(async () => {
  await closeDbClient()
})

describe('api call stats e2e', () => {
  it('adds, updates and deletes call stats records', async () => {
    const sessionCookie = await loginAsAdmin()
    const adminClient = createAdminClient(sessionCookie)

    await e2eFetch('/api/v1/test', {
      method: 'GET',
    })

    const apis = await adminClient.get<AdminApiItem[]>('/api/admin/apis/list', {
      keyword: 'test_statistics_demo',
    })
    expect(apis.code).toBe(0)

    const trackedApi = apis.data.find(item => item.code === 'test_statistics_demo')
    expect(trackedApi).toBeTruthy()

    const apiId = Number(trackedApi?.id)

    try {
      await e2eFetch('/api/v1/test', {
        method: 'GET',
      })

      const statAfterFirstCall = await waitForValue(
        async () => {
          const stats = await adminClient.get<ApiCallStatsResponse>('/api/admin/calls/stats')
          return stats.data.items.find(item => item.apiListId === apiId) || null
        },
        value => Boolean(value),
      )

      const firstTotal = Number(statAfterFirstCall?.totalCount || 0)
      expect(firstTotal).toBeGreaterThan(0)

      await e2eFetch('/api/v1/test', {
        method: 'GET',
      })

      const statAfterSecondCall = await waitForValue(
        async () => {
          const stats = await adminClient.get<ApiCallStatsResponse>('/api/admin/calls/stats')
          return stats.data.items.find(item => item.apiListId === apiId) || null
        },
        value => Number(value?.totalCount || 0) > firstTotal,
      )

      expect(Number(statAfterSecondCall?.totalCount || 0)).toBeGreaterThan(firstTotal)

      await deleteApiCallStatsByApiId(apiId)

      await waitForValue(
        async () => {
          const stats = await adminClient.get<ApiCallStatsResponse>('/api/admin/calls/stats')
          return stats.data.items.some(item => item.apiListId === apiId)
        },
        hasTarget => hasTarget === false,
      )
    }
    finally {
      await deleteApiCallStatsByApiId(apiId)
      await deleteApiCallsByApiId(apiId)
    }
  })
})
