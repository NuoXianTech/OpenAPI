import { describe, expect, it } from 'vitest'
import {
  formatExchangeRateResponseExample,
  formatStandardResponseExample
} from '@/utils/public-api-example'

describe('public API examples', () => {
  it('keeps the standard response free of endpoint-specific data', () => {
    const response = formatStandardResponseExample('请求成功', 123)

    expect(response).toContain('"message": "请求成功"')
    expect(response).toContain('"data": null')
    expect(response).not.toContain('base_code')
    expect(response).not.toContain('rates')
  })

  it('keeps endpoint data in the exchange-rate response example', () => {
    const response = formatExchangeRateResponseExample('获取汇率成功', 123)

    expect(response).toContain('"base_code": "CNY"')
    expect(response).toContain('"rates"')
  })
})
