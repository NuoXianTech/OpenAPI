import { useRuntimeConfig } from '#imports'
import { describe, expect, it } from 'vitest'

describe('nuxt test environment', () => {
  it('loads Nuxt runtime composables', () => {
    const config = useRuntimeConfig()

    expect(config.public).toBeDefined()
  })
})
