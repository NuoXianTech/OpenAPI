import { describe, expect, it } from 'vitest'
import { API_STATUS } from '#shared/config/api-status'
import { resolveApiAutoStatusFromStatusCodes } from '~~/server/services/api-status-service'

describe('resolveApiAutoStatusFromStatusCodes', () => {
  it('returns unknown when there are no calls', () => {
    expect(resolveApiAutoStatusFromStatusCodes([])).toBe(API_STATUS.unknown)
  })

  it('returns normal only when every recent status code is 200', () => {
    expect(resolveApiAutoStatusFromStatusCodes([200, 200, 200])).toBe(API_STATUS.normal)
  })

  it('returns abnormal when any recent status code is not 200', () => {
    expect(resolveApiAutoStatusFromStatusCodes([200, 500, 200])).toBe(API_STATUS.abnormal)
    expect(resolveApiAutoStatusFromStatusCodes([204])).toBe(API_STATUS.abnormal)
  })
})
