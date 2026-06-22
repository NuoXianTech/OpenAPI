import { describe, expect, it } from 'vitest'
import {
  USER_CALL_LOG_DEFAULT_FILTERS,
  useUserCallLogsPage
} from '../../../../app/composables/user/useUserCallLogsPage'

describe('useUserCallLogsPage', () => {
  it('counts only active user log filters', () => {
    const page = useUserCallLogsPage({ immediate: false })

    expect(USER_CALL_LOG_DEFAULT_FILTERS).toEqual({
      apiId: 0,
      apiKeyId: 0,
      status: 'all'
    })
    expect(page.activeFilterCount.value).toBe(0)

    page.filters.apiId = 5
    page.filters.status = 'failure'

    expect(page.activeFilterCount.value).toBe(2)
  })
})
