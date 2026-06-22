import { describe, expect, it } from 'vitest'
import {
  createCryptoBusinessError,
  isCryptoBusinessError
} from '~~/server/lib/crypto/types'
import {
  classifyDoubaoError,
  createDoubaoError,
  isDoubaoError
} from '~~/server/lib/doubao/types'
import {
  createRedemptionError,
  isRedemptionError
} from '~~/server/service/redemptionService'

describe('business error factories', () => {
  it('creates crypto business errors without classes', () => {
    const error = createCryptoBusinessError('failed', 'CUSTOM_CODE')

    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe('failed')
    expect(error.bizCode).toBe('CUSTOM_CODE')
    expect(isCryptoBusinessError(error)).toBe(true)
  })

  it('classifies doubao errors with status and billing category', () => {
    const error = createDoubaoError('business', 502, 'UPSTREAM_ERROR', 'upstream failed')

    expect(isDoubaoError(error)).toBe(true)
    expect(classifyDoubaoError(error, 'fallback')).toEqual({
      status: 502,
      code: 'UPSTREAM_ERROR',
      message: 'upstream failed',
      biz: true
    })
  })

  it('creates redemption errors with stable codes', () => {
    const error = createRedemptionError('USED_UP', 'used up')

    expect(error).toBeInstanceOf(Error)
    expect(error.code).toBe('USED_UP')
    expect(isRedemptionError(error)).toBe(true)
  })
})
