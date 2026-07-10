import { describe, expect, it } from 'vitest'
import { API_STATUS } from '#shared/config/api-status'
import {
  resolveApiAutoStatus,
  resolveEffectiveApiStatus,
  type ApiAutoStatusSample
} from '~~/server/services/api-status-service'

function samples(...values: Array<number | [number, string]>): ApiAutoStatusSample[] {
  return values.map(value => Array.isArray(value)
    ? { statusCode: value[0], errorCode: value[1] }
    : { statusCode: value, errorCode: null })
}

describe('resolveApiAutoStatus', () => {
  it('returns unknown when there are no calls', () => {
    expect(resolveApiAutoStatus([])).toBe(API_STATUS.unknown)
  })

  it('accepts successful HTTP responses without business errors', () => {
    expect(resolveApiAutoStatus(samples(200, 201, 204, 302))).toBe(API_STATUS.normal)
  })

  it('treats explicit business errors as failures', () => {
    expect(resolveApiAutoStatus(samples([200, 'BUSINESS_FAILED']))).toBe(API_STATUS.abnormal)
  })

  it('uses an eighty percent success threshold', () => {
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
