import { createHash } from 'node:crypto'
import type {
  ServiceConfigurationDefinition,
  ServiceConfigurationField,
  ServiceConfigurationValue
} from '#shared/types/service-control'
import { canonicalJson } from '~~/server/utils/canonical-json'

export class ServiceConfigurationValueError extends Error {
  constructor(
    readonly field: string,
    message: string
  ) {
    super(message)
    this.name = 'ServiceConfigurationValueError'
  }
}

export function serviceConfigurationFields(
  definition: ServiceConfigurationDefinition
): ServiceConfigurationField[] {
  return definition.groups.flatMap(group => group.fields)
}

export function assertServiceConfigurationDefinition(
  definition: ServiceConfigurationDefinition
): void {
  const groupKeys = new Set<string>()
  const fieldKeys = new Set<string>()

  for (const group of definition.groups) {
    if (groupKeys.has(group.key)) {
      throw new ServiceConfigurationValueError(
        group.key,
        `duplicate service configuration group: ${group.key}`
      )
    }
    groupKeys.add(group.key)

    for (const field of group.fields) {
      if (fieldKeys.has(field.key)) {
        throw new ServiceConfigurationValueError(
          field.key,
          `duplicate service configuration field: ${field.key}`
        )
      }
      fieldKeys.add(field.key)

      if (
        (field.type === 'text'
          || field.type === 'textarea'
          || field.type === 'secret')
        && field.minLength !== undefined
        && field.maxLength !== undefined
        && field.minLength > field.maxLength
      ) {
        throw new ServiceConfigurationValueError(
          field.key,
          `${field.key} has minLength greater than maxLength`
        )
      }
      if (
        field.type === 'number'
        && field.minimum !== undefined
        && field.maximum !== undefined
        && field.minimum > field.maximum
      ) {
        throw new ServiceConfigurationValueError(
          field.key,
          `${field.key} has minimum greater than maximum`
        )
      }
      if (field.type === 'single-select' || field.type === 'multi-select') {
        const optionValues = new Set<string>()
        for (const option of field.options) {
          if (optionValues.has(option.value)) {
            throw new ServiceConfigurationValueError(
              field.key,
              `${field.key} contains duplicate option value: ${option.value}`
            )
          }
          optionValues.add(option.value)
        }
      }
    }
  }
}

export function defaultServiceConfigurationValues(
  definition: ServiceConfigurationDefinition
): Record<string, ServiceConfigurationValue> {
  return Object.fromEntries(
    serviceConfigurationFields(definition).map(field => [
      field.key,
      field.type === 'secret' ? '' : structuredClone(field.default)
    ])
  )
}

export function normalizeServiceConfigurationValues(
  definition: ServiceConfigurationDefinition,
  input: Record<string, unknown>,
  baseValues: Record<string, ServiceConfigurationValue> =
    defaultServiceConfigurationValues(definition)
): Record<string, ServiceConfigurationValue> {
  const fields = serviceConfigurationFields(definition)
  const knownKeys = new Set(fields.map(field => field.key))
  const unknownKey = Object.keys(input).find(key => !knownKeys.has(key))
  if (unknownKey) {
    throw new ServiceConfigurationValueError(
      unknownKey,
      `unknown service configuration field: ${unknownKey}`
    )
  }

  const normalized: Record<string, ServiceConfigurationValue> = {}
  for (const field of fields) {
    const value = Object.hasOwn(input, field.key)
      ? input[field.key]
      : baseValues[field.key]
    normalized[field.key] = normalizeFieldValue(field, value)
  }
  return normalized
}

export function calculateServiceConfigurationHash(
  schemaSha256: string,
  values: Record<string, ServiceConfigurationValue>
): string {
  return createHash('sha256')
    .update(canonicalJson({ schemaSha256, values }))
    .digest('hex')
}

function normalizeFieldValue(
  field: ServiceConfigurationField,
  value: unknown
): ServiceConfigurationValue {
  switch (field.type) {
    case 'boolean':
      if (typeof value !== 'boolean') throw invalidType(field, 'boolean')
      return value
    case 'number': {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw invalidType(field, 'finite number')
      }
      if (field.minimum !== undefined && value < field.minimum) {
        throw invalidValue(field, `must be at least ${field.minimum}`)
      }
      if (field.maximum !== undefined && value > field.maximum) {
        throw invalidValue(field, `must be at most ${field.maximum}`)
      }
      if (field.step !== undefined) {
        const steps = (value - (field.minimum ?? 0)) / field.step
        if (Math.abs(steps - Math.round(steps)) > Number.EPSILON * 16) {
          throw invalidValue(field, `must use step ${field.step}`)
        }
      }
      return value
    }
    case 'text':
    case 'textarea':
    case 'secret':
      return normalizeText(field, value)
    case 'single-select':
      if (typeof value !== 'string') throw invalidType(field, 'string')
      if (!field.options.some(option => option.value === value)) {
        throw invalidValue(field, 'contains an unsupported option')
      }
      return value
    case 'multi-select': {
      if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
        throw invalidType(field, 'string array')
      }
      const allowed = new Set(field.options.map(option => option.value))
      const unique = Array.from(new Set(value as string[]))
      if (unique.some(item => !allowed.has(item))) {
        throw invalidValue(field, 'contains an unsupported option')
      }
      if (field.required && unique.length === 0) {
        throw invalidValue(field, 'is required')
      }
      return unique
    }
  }
}

function normalizeText(
  field: Extract<
    ServiceConfigurationField,
    { type: 'text' | 'textarea' | 'secret' }
  >,
  value: unknown
): string {
  if (typeof value !== 'string') throw invalidType(field, 'string')
  if (field.required && value.length === 0) {
    throw invalidValue(field, 'is required')
  }
  if (field.minLength !== undefined && value.length < field.minLength) {
    throw invalidValue(
      field,
      `must contain at least ${field.minLength} characters`
    )
  }
  if (field.maxLength !== undefined && value.length > field.maxLength) {
    throw invalidValue(
      field,
      `must contain at most ${field.maxLength} characters`
    )
  }
  return value
}

function invalidType(field: ServiceConfigurationField, expected: string) {
  return new ServiceConfigurationValueError(
    field.key,
    `${field.key} must be a ${expected}`
  )
}

function invalidValue(field: ServiceConfigurationField, message: string) {
  return new ServiceConfigurationValueError(
    field.key,
    `${field.key} ${message}`
  )
}
