import { describe, expect, it } from 'vitest'
import {
  ADMIN_CALL_LOG_DEFAULT_FILTERS,
  useAdminCallLogsPage
} from '../../../../app/composables/admin/useAdminCallLogsPage'

describe('useAdminCallLogsPage', () => {
  it('exports stable default filters and active filter counting', () => {
    const page = useAdminCallLogsPage({ immediate: false })

    expect(ADMIN_CALL_LOG_DEFAULT_FILTERS).toMatchObject({
      startAt: '',
      endAt: '',
      apiId: 0,
      categoryId: 0,
      types: [],
      apiKeyId: '',
      userId: '',
      requestId: ''
    })
    expect(page.activeFilterCount.value).toBe(0)

    page.filters.apiId = 12
    page.filters.requestId = 'req-1'

    expect(page.activeFilterCount.value).toBe(2)
  })
})
