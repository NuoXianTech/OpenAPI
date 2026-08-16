import { describe, expect, it } from 'vitest'
import { canonicalJson } from '~~/server/utils/canonical-json'

describe('canonicalJson', () => {
  it('sorts object keys recursively while preserving array order', () => {
    expect(canonicalJson({ z: 1, a: { d: 2, b: 1 }, list: [{ y: 2, x: 1 }] }))
      .toBe('{"a":{"b":1,"d":2},"list":[{"x":1,"y":2}],"z":1}')
  })
})
