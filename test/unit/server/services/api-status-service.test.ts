import { describe, expect, it } from 'vitest'
import { API_STATUS } from '#shared/config/api-status'
import {
  resolveApiAutoStatus,
  resolveEffectiveApiStatus,
  type ApiAutoStatusSample
} from '~~/server/services/api-status-service'

function samples(...statusCodes: number[]): ApiAutoStatusSample[] {
  return statusCodes.map(statusCode => ({ statusCode }))
}

describe('resolveApiAutoStatus', () => {
  it('returns unknown when there are no calls', () => {
    expect(resolveApiAutoStatus([])).toBe(API_STATUS.unknown)
  })

  it('treats valid 2xx, 3xx and 4xx responses as available', () => {
    expect(resolveApiAutoStatus(samples(200, 204, 302, 400, 404, 422)))
      .toBe(API_STATUS.normal)
  })

  it('treats server errors as unavailable', () => {
    expect(resolveApiAutoStatus(samples(500, 502, 504))).toBe(API_STATUS.abnormal)
  })

  it('uses an eighty percent availability threshold', () => {
    expect(resolveApiAutoStatus(samples(200, 200, 200, 200, 500))).toBe(API_STATUS.normal)
    expect(resolveApiAutoStatus(samples(200, 200, 200, 500, 500))).toBe(API_STATUS.abnormal)
  })
})

describe('resolveEffectiveApiStatus', () => {
  it('keeps manually configured statuses', () => {
    expect(resolveEffectiveApiStatus(API_STATUS.maintenance, false, API_STATUS.normal))
      .toBe(API_STATUS.maintenance)
  })

  it('requires statistics for automatic status', () => {
    expect(resolveEffectiveApiStatus(API_STATUS.automatic, false, API_STATUS.normal))
      .toBe(API_STATUS.unknown)
    expect(resolveEffectiveApiStatus(API_STATUS.automatic, true, API_STATUS.normal))
      .toBe(API_STATUS.normal)
  })
})
