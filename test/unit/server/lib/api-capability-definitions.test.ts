import { describe, expect, it } from 'vitest'
import { normalizeApiCapabilityValues } from '~~/server/lib/api-capabilities/values'
import { apiCapabilityDefinition as cryptoDefinition } from '~~/server/api-capabilities/v1/crypto'
import { apiCapabilityDefinition as doubaoDefinition } from '~~/server/api-capabilities/v1/doubao'
import { apiCapabilityDefinition as maoyanDefinition } from '~~/server/api-capabilities/v1/maoyan'
import { apiCapabilityDefinition as musicDefinition } from '~~/server/api-capabilities/v1/music'
import { apiCapabilityDefinition as playerDefinition } from '~~/server/api-capabilities/v1/player'

const definitions = [
  cryptoDefinition,
  doubaoDefinition,
  maoyanDefinition,
  musicDefinition,
  playerDefinition
]

describe('public API capability definitions', () => {
  it('provides valid defaults for every declared capability', () => {
    for (const definition of definitions) {
      expect(() => normalizeApiCapabilityValues(definition, {})).not.toThrow()
      expect(definition.fields.length).toBeGreaterThan(0)
    }
  })

  it('uses unique field keys inside each interface', () => {
    for (const definition of definitions) {
      const keys = definition.fields.map(field => field.key)
      expect(new Set(keys).size).toBe(keys.length)
    }
  })

  it('keeps the unavailable Qianqian provider disabled by default', () => {
    const enabledPlatforms = musicDefinition.fields.find(field => field.key === 'enabledPlatforms')
    expect(enabledPlatforms?.defaultValue).toEqual(['netease', 'tencent', 'kugou', 'kuwo'])
  })
})
