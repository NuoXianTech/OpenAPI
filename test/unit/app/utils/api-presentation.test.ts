import { describe, expect, it } from 'vitest'
import { API_STATUS } from '#shared/config/api-status'
import {
  areAllEndpointsPaid,
  getAggregateEndpointCost,
  resolveApiStatusMeta
} from '@/utils/api-presentation'

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

  it('summarizes pricing across distinct endpoints', () => {
    expect(getAggregateEndpointCost([])).toBe(0)
    expect(getAggregateEndpointCost([
      { creditsCost: 2 },
      { creditsCost: 2 }
    ])).toBe(2)
    expect(getAggregateEndpointCost([
      { creditsCost: 0 },
      { creditsCost: 2 }
    ])).toBe(-1)
    expect(areAllEndpointsPaid([
      { creditsCost: 1 },
      { creditsCost: 2 }
    ])).toBe(true)
    expect(areAllEndpointsPaid([
      { creditsCost: 0 },
      { creditsCost: 2 }
    ])).toBe(false)
  })
})
