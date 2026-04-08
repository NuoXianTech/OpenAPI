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

const statsWaitTimeoutMs = Number(process.env.E2E_STATS_WAIT_TIMEOUT_MS || (process.env.CI ? 90_000 : 30_000))
const statsWaitIntervalMs = Number(process.env.E2E_STATS_WAIT_INTERVAL_MS || (process.env.CI ? 500 : 300))

afterAll(async () => {
  await closeDbClient()
})

describe('api call stats e2e', () => {
  it('adds, updates and deletes call stats records', async () => {
    // Ensure test_statistics_demo exists before admin APIs warm the middleware target cache.
    await e2eFetch('/api/v1/test', {
      method: 'GET',
    })

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
        {
          timeoutMs: statsWaitTimeoutMs,
          intervalMs: statsWaitIntervalMs,
        },
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
        {
          timeoutMs: statsWaitTimeoutMs,
          intervalMs: statsWaitIntervalMs,
        },
      )

      expect(Number(statAfterSecondCall?.totalCount || 0)).toBeGreaterThan(firstTotal)

      await deleteApiCallStatsByApiId(apiId)

      await waitForValue(
        async () => {
          const stats = await adminClient.get<ApiCallStatsResponse>('/api/admin/calls/stats')
          return stats.data.items.some(item => item.apiListId === apiId)
        },
        hasTarget => hasTarget === false,
        {
          timeoutMs: statsWaitTimeoutMs,
          intervalMs: statsWaitIntervalMs,
        },
      )
    }
    finally {
      await deleteApiCallStatsByApiId(apiId)
      await deleteApiCallsByApiId(apiId)
    }
  })
})
