import { describe, expect, it } from 'vitest'
import { API_STATUS } from '#shared/config/api-status'
import { resolveApiStatusMeta } from '@/utils/api-presentation'

describe('API status presentation', () => {
  it.each([
    [API_STATUS.normal, 'success'],
    [API_STATUS.abnormal, 'error'],
    [API_STATUS.maintenance, 'warning'],
    [API_STATUS.automatic, 'info'],
    [API_STATUS.deprecated, 'neutral'],
    [API_STATUS.unknown, 'neutral']
  ] as const)('maps status %s to the %s semantic color', (status, color) => {
    expect(resolveApiStatusMeta(status, key => key).color).toBe(color)
  })
})
