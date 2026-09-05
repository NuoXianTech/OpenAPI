import { describe, expect, it } from 'vitest'
import {
  nextServiceConfigurationRevision,
  serviceConfigurationSynchronizationRevision
} from '~~/server/services/platform-service-configuration-service'

describe('Service configuration revision selection', () => {
  it('allocates above the highest enabled Target revision', () => {
    expect(nextServiceConfigurationRevision(3, [
      { enabled: true, configurationRevision: 7, configurationHash: 'a' },
      { enabled: false, configurationRevision: 20, configurationHash: 'b' },
      { enabled: true, configurationRevision: null, configurationHash: null }
    ])).toBe(8)
  })

  it('reuses an idempotent revision and advances conflicting state', () => {
    const matching = [{
      enabled: true,
      configurationRevision: 3,
      configurationHash: 'desired'
    }]
    const ahead = [{
      enabled: true,
      configurationRevision: 5,
      configurationHash: 'other'
    }]

    expect(serviceConfigurationSynchronizationRevision(
      3,
      'desired',
      matching
    )).toBe(3)
    expect(serviceConfigurationSynchronizationRevision(
      3,
      'desired',
      ahead
    )).toBe(6)
  })
})
