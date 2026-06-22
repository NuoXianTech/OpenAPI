import { describe, expect, it } from 'vitest'
import { useRuntimeConfig } from '#imports'

describe('nuxt test runtime', () => {
  it('loads the application runtime config', () => {
    const config = useRuntimeConfig()

    expect(config.auth).toMatchObject({
      adminUsername: '',
      adminPassword: '',
      adminEmail: '',
      emailVerifySecret: '',
      apiKeySecret: '',
      jwtSecret: ''
    })
  })
})
