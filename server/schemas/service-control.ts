import { z } from 'zod'

const fieldKeySchema = z.string()
  .min(1)
  .max(160)
  .regex(/^[a-z][A-Za-z0-9]*(?:[._-][a-z][A-Za-z0-9]*)*$/)

const optionSchema = z.object({
  label: z.string().min(1).max(300),
  value: z.string().max(500),
  description: z.string().max(1000).optional()
})

const fieldBase = {
  key: fieldKeySchema,
  label: z.string().min(1).max(300),
  description: z.string().max(2000).optional(),
  required: z.boolean().optional()
}

const serviceConfigurationFieldSchema = z.discriminatedUnion(
  'type',
  [
    z.object({
      ...fieldBase,
      type: z.literal('boolean'),
      default: z.boolean()
    }),
    z.object({
      ...fieldBase,
      type: z.enum(['text', 'textarea']),
      default: z.string().max(100_000),
      placeholder: z.string().max(1000).optional(),
      minLength: z.number().int().nonnegative().optional(),
      maxLength: z.number().int().positive().max(100_000).optional()
    }),
    z.object({
      ...fieldBase,
      type: z.literal('secret'),
      placeholder: z.string().max(1000).optional(),
      minLength: z.number().int().nonnegative().optional(),
      maxLength: z.number().int().positive().max(100_000).optional()
    }),
    z.object({
      ...fieldBase,
      type: z.literal('number'),
      default: z.number(),
      minimum: z.number().optional(),
      maximum: z.number().optional(),
      step: z.number().positive().optional()
    }),
    z.object({
      ...fieldBase,
      type: z.literal('single-select'),
      default: z.string(),
      options: z.array(optionSchema).min(1).max(500)
    }),
    z.object({
      ...fieldBase,
      type: z.literal('multi-select'),
      default: z.array(z.string()).max(500),
      options: z.array(optionSchema).min(1).max(500)
    })
  ]
)

export const serviceConfigurationDefinitionSchema = z.object({
  schemaVersion: z.literal(1),
  groups: z.array(z.object({
    key: fieldKeySchema,
    label: z.string().min(1).max(300),
    description: z.string().max(2000).optional(),
    fields: z.array(serviceConfigurationFieldSchema).max(1000)
  })).max(200)
})

export const serviceDescriptionSchema = z.object({
  schemaVersion: z.literal(1),
  serviceId: z.string().min(1).max(120),
  name: z.string().min(1).max(160),
  version: z.string().min(1).max(160),
  commit: z.string().min(1).max(160),
  openapi: z.string().startsWith('/').max(1000),
  openapiSha256: z.string().regex(/^[0-9a-f]{64}$/),
  health: z.string().startsWith('/').max(1000),
  readiness: z.string().startsWith('/').max(1000),
  configuration: z.object({
    schema: z.string().startsWith('/').max(1000),
    state: z.string().startsWith('/').max(1000),
    update: z.string().startsWith('/').max(1000),
    schemaSha256: z.string().regex(/^[0-9a-f]{64}$/)
  }),
  platformProtocol: z.literal('openapi-platform-service/v1')
})

const configurationValueSchema = z.union([
  z.boolean(),
  z.number(),
  z.string(),
  z.array(z.string())
])

export const redactedServiceConfigurationStateSchema = z.object({
  schemaVersion: z.literal(1),
  serviceId: z.string().min(1).max(120),
  schemaSha256: z.string().regex(/^[0-9a-f]{64}$/),
  revision: z.number().int().nonnegative(),
  configurationSha256: z.string().regex(/^[0-9a-f]{64}$/),
  values: z.record(
    z.string(),
    z.union([
      configurationValueSchema,
      z.object({ configured: z.boolean() })
    ])
  ),
  updatedAt: z.string().nullable()
})

export const serviceConfigurationUpdateResponseSchema = z.object({
  schemaVersion: z.literal(1),
  serviceId: z.string().min(1).max(120),
  schemaSha256: z.string().regex(/^[0-9a-f]{64}$/),
  revision: z.number().int().positive(),
  configurationSha256: z.string().regex(/^[0-9a-f]{64}$/),
  updatedAt: z.string()
})

export const openapiDocumentSchema = z.record(z.string(), z.unknown())

export const adminUpdateServiceConfigurationSchema = z.object({
  expectedRevision: z.number().int().nonnegative(),
  values: z.record(z.string(), z.unknown()).default({}),
  secrets: z.record(
    z.string(),
    z.string().max(100_000).nullable()
  ).default({})
})

export const adminUpdateServiceTokenSchema = z.object({
  serviceToken: z.string().trim().min(32).max(4096)
})
