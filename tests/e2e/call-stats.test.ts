import { afterAll, describe, expect, it } from 'vitest'
import { fetch as e2eFetch } from '@nuxt/test-utils/e2e'
import { createAdminClient, loginAsAdmin } from './helpers/admin-client'
import { waitForValue } from './helpers/wait'
import { setupE2E } from './helpers/setup'
import {
  closeDbClient,
  deleteApiCallStatsByApiId,
  deleteApiCallsByApiId,
  getApiCallStatByApiId
} from './helpers/db-cleanup'

await setupE2E()

interface AdminApiItem {
  id: number
  code: string
  pathVersion: string
  apiPath: string
  isEnabled: boolean
  isStatistics: boolean
}

const statsWaitTimeoutMs = Number(process.env.E2E_STATS_WAIT_TIMEOUT_MS || (process.env.CI ? 45_000 : 20_000))
const statsDeleteWaitTimeoutMs = Number(process.env.E2E_STATS_DELETE_WAIT_TIMEOUT_MS || (process.env.CI ? 20_000 : 10_000))
const statsWaitIntervalMs = Number(process.env.E2E_STATS_WAIT_INTERVAL_MS || (process.env.CI ? 500 : 250))
const callStatsTestTimeoutMs = Number(process.env.E2E_CALL_STATS_TEST_TIMEOUT_MS || (process.env.CI ? 120_000 : 90_000))

const TEST_PATH_VERSION = 'v1'
const TEST_CODE = 'test'

afterAll(async () => {
  await closeDbClient()
})

describe('api call stats e2e', () => {
  it('counts calls to a registered, enabled api', async () => {
    const sessionCookie = await loginAsAdmin()
    const adminClient = createAdminClient(sessionCookie)

    const registered = await adminClient.post<AdminApiItem>('/api/admin/apis/register', {
      pathVersion: TEST_PATH_VERSION,
      code: TEST_CODE,
      overrides: { isEnabled: true, isStatistics: true }
    })
    expect(registered.code).toBe(0)
    const apiId = Number(registered.data.id)
    expect(apiId).toBeGreaterThan(0)

    // register 仅在新建时落 overrides；如果已存在，需要再 update 一次确保启用 + 统计
    await adminClient.put('/api/admin/apis/update', {
      id: apiId,
      isEnabled: true,
      isStatistics: true
    })

    const apiPath = `/api/${TEST_PATH_VERSION}/${TEST_CODE}`

    async function callTrackedPath() {
      await e2eFetch(apiPath, { method: 'GET' })
    }

    await deleteApiCallStatsByApiId(apiId)
    await deleteApiCallsByApiId(apiId)

    try {
      await callTrackedPath()

      const statAfterFirstCall = await waitForValue(
        async () => {
          const stat = await getApiCallStatByApiId(apiId)
          if (!stat) await callTrackedPath()
          return stat
        },
        value => Number(value?.totalCount || 0) > 0,
        { timeoutMs: statsWaitTimeoutMs, intervalMs: statsWaitIntervalMs }
      )

      const firstTotal = Number(statAfterFirstCall?.totalCount || 0)
      expect(firstTotal).toBeGreaterThan(0)

      await callTrackedPath()

      const statAfterSecondCall = await waitForValue(
        async () => {
          const stat = await getApiCallStatByApiId(apiId)
          if (Number(stat?.totalCount || 0) <= firstTotal) await callTrackedPath()
          return stat
        },
        value => Number(value?.totalCount || 0) > firstTotal,
        { timeoutMs: statsWaitTimeoutMs, intervalMs: statsWaitIntervalMs }
      )

      expect(Number(statAfterSecondCall?.totalCount || 0)).toBeGreaterThan(firstTotal)

      await deleteApiCallStatsByApiId(apiId)

      await waitForValue(
        async () => {
          const stat = await getApiCallStatByApiId(apiId)
          if (stat) await deleteApiCallStatsByApiId(apiId)
          return stat
        },
        value => value === null,
        { timeoutMs: statsDeleteWaitTimeoutMs, intervalMs: statsWaitIntervalMs }
      )
    } finally {
      await deleteApiCallStatsByApiId(apiId)
      await deleteApiCallsByApiId(apiId)
      await adminClient.post('/api/admin/apis/delete', { id: apiId })
    }
  }, callStatsTestTimeoutMs)
})
