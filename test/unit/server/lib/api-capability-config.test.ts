import { describe, expect, it } from 'vitest'
import { API_CAPABILITY_CONTROL, type ApiCapabilityDefinition } from '#shared/types/api-capability'
import { normalizeApiCapabilityValues } from '~~/server/lib/api-capabilities/values'

const definition: ApiCapabilityDefinition = {
  title: 'Example capabilities',
  description: 'Test definition',
  fields: [
    {
      key: 'isFeatureEnabled',
      control: API_CAPABILITY_CONTROL.boolean,
      label: 'Feature',
      description: 'Feature switch',
      defaultValue: true
    },
    {
      key: 'enabledProviders',
      control: API_CAPABILITY_CONTROL.multiSelect,
      label: 'Providers',
      description: 'Provider switches',
      defaultValue: ['provider-a'],
      options: [
        { value: 'provider-a', label: 'Provider A' },
        { value: 'provider-b', label: 'Provider B' }
      ]
    },
    {
      key: 'primaryProvider',
      control: API_CAPABILITY_CONTROL.singleSelect,
      label: 'Primary provider',
      description: 'Primary provider',
      defaultValue: 'provider-a',
      options: [
        { value: 'provider-a', label: 'Provider A' },
        { value: 'provider-b', label: 'Provider B' }
      ]
    },
    {
      key: 'displayName',
      control: API_CAPABILITY_CONTROL.text,
      label: 'Display name',
      description: 'Display name',
      defaultValue: 'Example',
      minLength: 2,
      maxLength: 20
    },
    {
      key: 'notice',
      control: API_CAPABILITY_CONTROL.textarea,
      label: 'Notice',
      description: 'Notice',
      defaultValue: '',
      maxLength: 200
    },
    {
      key: 'retryCount',
      control: API_CAPABILITY_CONTROL.number,
      label: 'Retry count',
      description: 'Retry count',
      defaultValue: 2,
      min: 0,
      max: 5,
      step: 1
    }
  ]
}

describe('API capability values', () => {
  it('fills omitted values from declaration defaults', () => {
    expect(normalizeApiCapabilityValues(definition, {})).toEqual({
      isFeatureEnabled: true,
      enabledProviders: ['provider-a'],
      primaryProvider: 'provider-a',
      displayName: 'Example',
      notice: '',
      retryCount: 2
    })
  })

  it('accepts declared values', () => {
    expect(normalizeApiCapabilityValues(definition, {
      isFeatureEnabled: false,
      enabledProviders: ['provider-a', 'provider-b'],
      primaryProvider: 'provider-b',
      displayName: 'Production',
      notice: 'Configured',
      retryCount: 5
    })).toEqual({
      isFeatureEnabled: false,
      enabledProviders: ['provider-a', 'provider-b'],
      primaryProvider: 'provider-b',
      displayName: 'Production',
      notice: 'Configured',
      retryCount: 5
    })
  })

  it('rejects undeclared fields and option values', () => {
    expect(() => normalizeApiCapabilityValues(definition, {
      isFeatureEnabled: true,
      enabledProviders: ['provider-unknown'],
      primaryProvider: 'provider-a',
      displayName: 'Example',
      notice: '',
      retryCount: 2
    })).toThrow('包含未知或重复选项')

    expect(() => normalizeApiCapabilityValues(definition, {
      isFeatureEnabled: true,
      enabledProviders: [],
      primaryProvider: 'provider-a',
      displayName: 'Example',
      notice: '',
      retryCount: 2,
      unknownField: true
    })).toThrow('包含未知能力字段')
  })

  it('repairs stale stored values after a declaration changes', () => {
    expect(normalizeApiCapabilityValues(definition, {
      isFeatureEnabled: 'invalid',
      enabledProviders: ['provider-a', 'removed-provider'],
      primaryProvider: 'removed-provider',
      displayName: 'x',
      notice: 123,
      retryCount: 99,
      removedField: true
    }, true)).toEqual({
      isFeatureEnabled: true,
      enabledProviders: ['provider-a'],
      primaryProvider: 'provider-a',
      displayName: 'Example',
      notice: '',
      retryCount: 2
    })
  })

  it('validates text length and number range', () => {
    expect(() => normalizeApiCapabilityValues(definition, {
      isFeatureEnabled: true,
      enabledProviders: [],
      primaryProvider: 'provider-a',
      displayName: 'x',
      notice: '',
      retryCount: 2
    })).toThrow('不能少于 2 个字符')

    expect(() => normalizeApiCapabilityValues(definition, {
      isFeatureEnabled: true,
      enabledProviders: [],
      primaryProvider: 'provider-a',
      displayName: 'Example',
      notice: '',
      retryCount: 6
    })).toThrow('不能大于 5')
  })
})
