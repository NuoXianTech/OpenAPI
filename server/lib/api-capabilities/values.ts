import {
  API_CAPABILITY_CONTROL,
  type ApiCapabilityDefinition,
  type ApiCapabilityField,
  type ApiCapabilityMultiSelectField,
  type ApiCapabilityNumberField,
  type ApiCapabilityOption,
  type ApiCapabilitySingleSelectField,
  type ApiCapabilityTextField,
  type ApiCapabilityTextareaField
} from '#shared/types/api-capability'

const FIELD_KEY_PATTERN = /^[a-z][A-Za-z0-9]*$/

export interface ApiCapabilityValueError extends Error {
  statusCode: number
  errorCode: string
}

function createValueError(message: string, statusCode = 400): ApiCapabilityValueError {
  return Object.assign(new Error(message), {
    statusCode,
    errorCode: statusCode === 500 ? 'INVALID_API_CAPABILITY_DEFINITION' : 'INVALID_API_CAPABILITY_VALUE'
  })
}

function cloneDefaultValue(field: ApiCapabilityField): boolean | string | string[] | number {
  return Array.isArray(field.defaultValue) ? [...field.defaultValue] : field.defaultValue
}

export function createDefaultApiCapabilityValues(definition: ApiCapabilityDefinition): Record<string, unknown> {
  return Object.fromEntries(definition.fields.map(field => [field.key, cloneDefaultValue(field)]))
}

function validateOptions(field: ApiCapabilitySingleSelectField | ApiCapabilityMultiSelectField): void {
  if (field.options.length === 0) throw createValueError(`${field.label} 至少需要一个选项`, 500)

  const optionValues = new Set<string>()
  for (const option of field.options) {
    if (!option.value || optionValues.has(option.value)) {
      throw createValueError(`能力选项 ${option.value || '<空>'} 无效或重复`, 500)
    }
    optionValues.add(option.value)
  }

  const defaults = Array.isArray(field.defaultValue) ? field.defaultValue : [field.defaultValue]
  if (new Set(defaults).size !== defaults.length) {
    throw createValueError(`${field.label} 的默认值不能重复`, 500)
  }
  if (defaults.some(value => !optionValues.has(value))) {
    throw createValueError(`${field.label} 的默认值不在选项中`, 500)
  }
}

function validateTextField(field: ApiCapabilityTextField | ApiCapabilityTextareaField): void {
  if (field.minLength !== undefined && (!Number.isInteger(field.minLength) || field.minLength < 0)) {
    throw createValueError(`${field.label} 的最小长度必须是非负整数`, 500)
  }
  if (field.maxLength !== undefined && (!Number.isInteger(field.maxLength) || field.maxLength < 0)) {
    throw createValueError(`${field.label} 的最大长度必须是非负整数`, 500)
  }
  if (field.minLength !== undefined && field.maxLength !== undefined && field.minLength > field.maxLength) {
    throw createValueError(`${field.label} 的最小长度不能大于最大长度`, 500)
  }
  validateTextValue(field, field.defaultValue, false, 500)
}

function validateNumberField(field: ApiCapabilityNumberField): void {
  if (field.min !== undefined && field.max !== undefined && field.min > field.max) {
    throw createValueError(`${field.label} 的最小值不能大于最大值`, 500)
  }
  if (field.step !== undefined && (!Number.isFinite(field.step) || field.step <= 0)) {
    throw createValueError(`${field.label} 的步长必须大于 0`, 500)
  }
  validateNumberValue(field, field.defaultValue, false, 500)
}

export function validateApiCapabilityDefinition(definition: ApiCapabilityDefinition): void {
  const fieldKeys = new Set<string>()
  for (const field of definition.fields) {
    if (!FIELD_KEY_PATTERN.test(field.key) || fieldKeys.has(field.key)) {
      throw createValueError(`能力字段 ${field.key} 无效或重复`, 500)
    }
    fieldKeys.add(field.key)

    if (field.control === API_CAPABILITY_CONTROL.singleSelect
      || field.control === API_CAPABILITY_CONTROL.multiSelect) validateOptions(field)
    if (field.control === API_CAPABILITY_CONTROL.text
      || field.control === API_CAPABILITY_CONTROL.textarea) validateTextField(field)
    if (field.control === API_CAPABILITY_CONTROL.number) validateNumberField(field)
  }
}

function getAllowedOptionValues(options: ApiCapabilityOption[]): Set<string> {
  return new Set(options.map(option => option.value))
}

function normalizeSingleSelectValue(field: ApiCapabilitySingleSelectField, value: unknown): string {
  if (typeof value === 'string' && getAllowedOptionValues(field.options).has(value)) return value
  throw createValueError(`${field.label} 必须是有效的单选值`)
}

function normalizeMultiSelectValue(field: ApiCapabilityMultiSelectField, value: unknown): string[] {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
    throw createValueError(`${field.label} 必须是字符串数组`)
  }
  const allowedValues = getAllowedOptionValues(field.options)
  const normalizedValues = [...new Set(value)].filter(item => allowedValues.has(item))
  if (normalizedValues.length !== value.length) throw createValueError(`${field.label} 包含未知或重复选项`)
  return normalizedValues
}

function validateTextValue(
  field: ApiCapabilityTextField | ApiCapabilityTextareaField,
  value: unknown,
  isStoredValue: boolean,
  statusCode = 400
): string {
  if (typeof value !== 'string') {
    if (isStoredValue) return field.defaultValue
    throw createValueError(`${field.label} 必须是字符串`, statusCode)
  }
  if (field.minLength !== undefined && value.length < field.minLength) {
    if (isStoredValue) return field.defaultValue
    throw createValueError(`${field.label} 不能少于 ${field.minLength} 个字符`, statusCode)
  }
  if (field.maxLength !== undefined && value.length > field.maxLength) {
    if (isStoredValue) return field.defaultValue
    throw createValueError(`${field.label} 不能超过 ${field.maxLength} 个字符`, statusCode)
  }
  return value
}

function validateNumberValue(
  field: ApiCapabilityNumberField,
  value: unknown,
  isStoredValue: boolean,
  statusCode = 400
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    if (isStoredValue) return field.defaultValue
    throw createValueError(`${field.label} 必须是有效数字`, statusCode)
  }
  if (field.min !== undefined && value < field.min) {
    if (isStoredValue) return field.defaultValue
    throw createValueError(`${field.label} 不能小于 ${field.min}`, statusCode)
  }
  if (field.max !== undefined && value > field.max) {
    if (isStoredValue) return field.defaultValue
    throw createValueError(`${field.label} 不能大于 ${field.max}`, statusCode)
  }
  return value
}

function normalizeFieldValue(field: ApiCapabilityField, value: unknown, isStoredValue: boolean): unknown {
  try {
    if (field.control === API_CAPABILITY_CONTROL.boolean) {
      if (typeof value === 'boolean') return value
      throw createValueError(`${field.label} 必须是布尔值`)
    }
    if (field.control === API_CAPABILITY_CONTROL.singleSelect) return normalizeSingleSelectValue(field, value)
    if (field.control === API_CAPABILITY_CONTROL.multiSelect) return normalizeMultiSelectValue(field, value)
    if (field.control === API_CAPABILITY_CONTROL.text
      || field.control === API_CAPABILITY_CONTROL.textarea) return validateTextValue(field, value, isStoredValue)
    return validateNumberValue(field, value, isStoredValue)
  } catch (error) {
    if (isStoredValue) return cloneDefaultValue(field)
    throw error
  }
}

export function normalizeApiCapabilityValues(
  definition: ApiCapabilityDefinition,
  values: Record<string, unknown>,
  isStoredValue = false
): Record<string, unknown> {
  validateApiCapabilityDefinition(definition)
  const knownKeys = new Set(definition.fields.map(field => field.key))
  const unknownKeys = Object.keys(values).filter(key => !knownKeys.has(key))
  if (!isStoredValue && unknownKeys.length > 0) {
    throw createValueError(`包含未知能力字段：${unknownKeys.join(', ')}`)
  }

  return Object.fromEntries(definition.fields.map((field) => {
    const value = Object.hasOwn(values, field.key) ? values[field.key] : cloneDefaultValue(field)
    return [field.key, normalizeFieldValue(field, value, isStoredValue)]
  }))
}
