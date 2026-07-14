export const API_CAPABILITY_CONTROL = {
  boolean: 'boolean',
  singleSelect: 'single-select',
  multiSelect: 'multi-select',
  text: 'text',
  textarea: 'textarea',
  number: 'number'
} as const

interface ApiCapabilityFieldBase {
  key: string
  label: string
  description: string
}

export interface ApiCapabilityBooleanField extends ApiCapabilityFieldBase {
  control: typeof API_CAPABILITY_CONTROL.boolean
  defaultValue: boolean
}

export interface ApiCapabilityOption {
  value: string
  label: string
  description?: string
}

export interface ApiCapabilitySingleSelectField extends ApiCapabilityFieldBase {
  control: typeof API_CAPABILITY_CONTROL.singleSelect
  defaultValue: string
  options: ApiCapabilityOption[]
}

export interface ApiCapabilityMultiSelectField extends ApiCapabilityFieldBase {
  control: typeof API_CAPABILITY_CONTROL.multiSelect
  defaultValue: string[]
  options: ApiCapabilityOption[]
}

interface ApiCapabilityTextFieldBase extends ApiCapabilityFieldBase {
  defaultValue: string
  placeholder?: string
  minLength?: number
  maxLength?: number
  isSecret?: boolean
}

export interface ApiCapabilityTextField extends ApiCapabilityTextFieldBase {
  control: typeof API_CAPABILITY_CONTROL.text
}

export interface ApiCapabilityTextareaField extends ApiCapabilityTextFieldBase {
  control: typeof API_CAPABILITY_CONTROL.textarea
  rows?: number
}

export interface ApiCapabilityNumberField extends ApiCapabilityFieldBase {
  control: typeof API_CAPABILITY_CONTROL.number
  defaultValue: number
  min?: number
  max?: number
  step?: number
  placeholder?: string
}

export type ApiCapabilityField
  = | ApiCapabilityBooleanField
    | ApiCapabilitySingleSelectField
    | ApiCapabilityMultiSelectField
    | ApiCapabilityTextField
    | ApiCapabilityTextareaField
    | ApiCapabilityNumberField

export interface ApiCapabilityDefinition {
  title: string
  description: string
  fields: ApiCapabilityField[]
}

export interface ApiCapabilityManifestEntry {
  pathVersion: string
  code: string
  definition: ApiCapabilityDefinition
}

export interface ApiCapabilityConfigSnapshot {
  revision: number
  values: Record<string, unknown>
  isConfigured: boolean
  updatedAt: string | null
  configuredSecretKeys?: string[]
}

export interface AdminApiCapabilityResponse {
  definition: ApiCapabilityDefinition
  config: ApiCapabilityConfigSnapshot
}
