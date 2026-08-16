import { describe, expect, it } from 'vitest'
import type { ServiceConfigurationDefinition } from '#shared/types/service-control'
import { serviceConfigurationDefinitionSchema } from '~~/server/schemas/service-control'
import {
  assertServiceConfigurationDefinition,
  calculateServiceConfigurationHash,
  normalizeServiceConfigurationValues,
  ServiceConfigurationValueError
} from '~~/server/utils/service-configuration-values'

const definition = {
  schemaVersion: 1,
  groups: [{
    key: 'music',
    label: 'Music',
    fields: [
      {
        key: 'music.enabled',
        type: 'boolean',
        label: 'Enabled',
        default: true
      },
      {
        key: 'music.requestTimeout',
        type: 'number',
        label: 'Timeout',
        default: 5,
        minimum: 1,
        maximum: 30,
        step: 1
      },
      {
        key: 'music.primaryPlatform',
        type: 'single-select',
        label: 'Primary platform',
        default: 'netease',
        options: [
          { label: 'NetEase', value: 'netease' },
          { label: 'QQ Music', value: 'qq' }
        ]
      },
      {
        key: 'music.enabledPlatforms',
        type: 'multi-select',
        label: 'Enabled platforms',
        default: ['netease'],
        options: [
          { label: 'NetEase', value: 'netease' },
          { label: 'QQ Music', value: 'qq' }
        ]
      },
      {
        key: 'music.neteaseCookie',
        type: 'secret',
        label: 'Cookie',
        maxLength: 4096
      }
    ]
  }]
} as const satisfies ServiceConfigurationDefinition

describe('service configuration values', () => {
  it('accepts camelCase field segments used by business modules', () => {
    expect(serviceConfigurationDefinitionSchema.safeParse(definition).success)
      .toBe(true)
    expect(() => assertServiceConfigurationDefinition(definition))
      .not.toThrow()
  })

  it('normalizes every supported value kind', () => {
    expect(normalizeServiceConfigurationValues(definition, {
      'music.enabled': false,
      'music.requestTimeout': 10,
      'music.primaryPlatform': 'qq',
      'music.enabledPlatforms': ['qq', 'qq', 'netease'],
      'music.neteaseCookie': 'secret-cookie'
    })).toEqual({
      'music.enabled': false,
      'music.requestTimeout': 10,
      'music.primaryPlatform': 'qq',
      'music.enabledPlatforms': ['qq', 'netease'],
      'music.neteaseCookie': 'secret-cookie'
    })
  })

  it('rejects unknown fields and invalid select options', () => {
    expect(() => normalizeServiceConfigurationValues(definition, {
      'music.unknown': true
    })).toThrow(ServiceConfigurationValueError)
    expect(() => normalizeServiceConfigurationValues(definition, {
      'music.primaryPlatform': 'unsupported'
    })).toThrow(ServiceConfigurationValueError)
  })

  it('rejects duplicate fields and option values before rendering a form', () => {
    const duplicateField = structuredClone(definition) as
      ServiceConfigurationDefinition
    duplicateField.groups[0]!.fields.push(
      structuredClone(duplicateField.groups[0]!.fields[0]!)
    )
    expect(() => assertServiceConfigurationDefinition(duplicateField))
      .toThrow(/duplicate service configuration field/)

    const duplicateOption = structuredClone(definition) as
      ServiceConfigurationDefinition
    const select = duplicateOption.groups[0]!.fields[2]!
    if (select.type !== 'single-select') throw new Error('invalid fixture')
    select.options.push({ label: 'Duplicate', value: 'netease' })
    expect(() => assertServiceConfigurationDefinition(duplicateOption))
      .toThrow(/duplicate option value/)
  })

  it('calculates a stable fingerprint independent of object key order', () => {
    const left = calculateServiceConfigurationHash('a'.repeat(64), {
      'music.enabled': true,
      'music.neteaseCookie': 'secret-cookie'
    })
    const right = calculateServiceConfigurationHash('a'.repeat(64), {
      'music.neteaseCookie': 'secret-cookie',
      'music.enabled': true
    })

    expect(left).toBe(right)
    expect(left).toMatch(/^[0-9a-f]{64}$/)
  })
})
