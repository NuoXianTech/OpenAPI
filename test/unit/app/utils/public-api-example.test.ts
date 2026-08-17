import { describe, expect, it } from 'vitest'
import {
  formatStandardResponseExample,
  formatYiyanResponseExample
} from '@/utils/public-api-example'

describe('public API examples', () => {
  it('keeps the standard response free of endpoint-specific data', () => {
    const response = formatStandardResponseExample('请求成功', 123)

    expect(response).toContain('"message": "请求成功"')
    expect(response).toContain('"data": null')
    expect(response).not.toContain('base_code')
    expect(response).not.toContain('rates')
  })

  it('keeps endpoint data in the yiyan response example', () => {
    const response = formatYiyanResponseExample('请求成功', 123)

    expect(response).toContain('"id": "a1"')
    expect(response).toContain('"yiyan": "与众不同的生活方式很累人呢，因为找不到借口。"')
    expect(response).toContain('"from": "幸运星"')
  })
})
