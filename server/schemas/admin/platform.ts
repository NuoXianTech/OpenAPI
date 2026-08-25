import { z } from 'zod'

const slugSchema = z.string().trim().min(1).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
const nameSchema = z.string().trim().min(1).max(160)
const hostSchema = z.string().trim().min(1).max(253)
const pathSchema = z.string().trim().min(1).max(1000).startsWith('/')
const httpMethodSchema = z.enum(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'])

export const adminUpdateRuntimeSchema = z.object({
  defaultDomain: hostSchema.nullable()
})

export const adminCreateProductSchema = z.object({
  slug: slugSchema,
  name: nameSchema,
  summary: z.string().trim().max(300).optional(),
  description: z.string().trim().max(20_000).optional(),
  categoryId: z.coerce.number().int().positive().nullable().optional(),
  visibility: z.enum(['public', 'private']).default('public'),
  version: z.string().trim().min(1).max(80).default('v1')
})

export const adminUpdateProductSchema = z.object({
  slug: slugSchema.optional(),
  name: nameSchema.optional(),
  summary: z.string().trim().max(300).optional(),
  description: z.string().trim().max(20_000).optional(),
  categoryId: z.coerce.number().int().positive().nullable().optional(),
  visibility: z.enum(['public', 'private']).optional(),
  lifecycle: z.enum(['active', 'deprecated', 'retired']).optional()
}).refine(value => Object.keys(value).length > 0, 'at least one field is required')

export const adminCreateVersionSchema = z.object({
  productId: z.uuid(),
  version: z.string().trim().min(1).max(80),
  state: z.enum(['draft', 'published', 'deprecated', 'retired']).default('draft'),
  changelog: z.string().trim().max(20_000).default('')
})

export const adminUpdateVersionSchema = z.object({
  version: z.string().trim().min(1).max(80).optional(),
  state: z.enum(['draft', 'published', 'deprecated', 'retired']).optional(),
  changelog: z.string().trim().max(20_000).optional()
}).refine(value => Object.keys(value).length > 0, 'at least one field is required')

export const adminCreateUpstreamSchema = z.object({
  slug: slugSchema,
  name: nameSchema,
  serviceToken: z.string().trim().min(32).max(4096).optional(),
  loadBalancing: z.enum(['round_robin', 'weighted']).default('round_robin'),
  targets: z.array(z.object({
    baseUrl: z.url().max(2000),
    weight: z.coerce.number().int().min(1).max(10_000).default(1)
  })).min(1).max(32)
})

export const adminUpdateUpstreamSchema = z.object({
  slug: slugSchema.optional(),
  name: nameSchema.optional(),
  loadBalancing: z.enum(['round_robin', 'weighted']).optional(),
  status: z.enum(['active', 'disabled']).optional()
}).refine(value => Object.keys(value).length > 0, 'at least one field is required')

export const adminCreateTargetSchema = z.object({
  baseUrl: z.url().max(2000),
  weight: z.coerce.number().int().min(1).max(10_000).default(1),
  enabled: z.boolean().default(true)
})

export const adminUpdateTargetSchema = z.object({
  baseUrl: z.url().max(2000).optional(),
  weight: z.coerce.number().int().min(1).max(10_000).optional(),
  enabled: z.boolean().optional()
}).refine(value => Object.keys(value).length > 0, 'at least one field is required')

export const adminRouteSchema = z.object({
  apiVersionId: z.uuid(),
  name: nameSchema,
  hosts: z.array(hostSchema).max(32).default([]),
  method: httpMethodSchema,
  pathPattern: pathSchema,
  upstreamServiceId: z.uuid(),
  upstreamPathTemplate: pathSchema,
  isApiKey: z.boolean().default(false),
  isStatistics: z.boolean().default(true),
  creditsCost: z.coerce.number().int().min(0).max(1_000_000).default(0),
  rateLimitPerSecond: z.coerce.number().int().min(0).max(1_000_000).default(0),
  rateLimitPerMinute: z.coerce.number().int().min(0).max(10_000_000).default(0),
  rateLimitPerHour: z.coerce.number().int().min(0).max(100_000_000).default(0),
  rateLimitPerDay: z.coerce.number().int().min(0).max(1_000_000_000).default(0),
  timeoutMs: z.coerce.number().int().min(100).max(120_000).default(10_000),
  maxRequestBytes: z.coerce.number().int().min(0).max(1024 * 1024 * 1024).default(1024 * 1024),
  maxResponseBytes: z.coerce.number().int().min(0).max(2_147_483_647).default(10 * 1024 * 1024),
  catalogStatus: z.enum(['automatic', 'maintenance']).default('automatic'),
  sensitiveQueryParameters: z.array(z.string().trim().min(1).max(100)).max(64).default([]),
  state: z.enum(['draft', 'active', 'disabled']).default('active')
}).superRefine((value, context) => {
  if (value.creditsCost > 0 && (!value.isApiKey || !value.isStatistics)) {
    context.addIssue({
      code: 'custom',
      path: ['creditsCost'],
      message: '付费 Route 必须启用 API Key 和调用统计'
    })
  }
})

export const adminPublishServiceEndpointSchema = z.object({
  upstreamServiceId: z.uuid(),
  method: httpMethodSchema,
  path: pathSchema
})

export const adminUpdateEndpointPublicationSchema = z.object({
  enabled: z.boolean().optional(),
  name: nameSchema.optional(),
  isApiKey: z.boolean().optional(),
  isStatistics: z.boolean().optional(),
  creditsCost: z.coerce.number().int().min(0).max(1_000_000).optional(),
  rateLimitPerSecond: z.coerce.number().int().min(0).max(1_000_000).optional(),
  rateLimitPerMinute: z.coerce.number().int().min(0).max(10_000_000).optional(),
  rateLimitPerHour: z.coerce.number().int().min(0).max(100_000_000).optional(),
  rateLimitPerDay: z.coerce.number().int().min(0).max(1_000_000_000).optional(),
  timeoutMs: z.coerce.number().int().min(100).max(120_000).optional(),
  maxRequestBytes: z.coerce.number().int().min(0).max(1024 * 1024 * 1024).optional(),
  maxResponseBytes: z.coerce.number().int().min(0).max(2_147_483_647).optional(),
  catalogStatus: z.enum(['automatic', 'maintenance']).optional(),
  sensitiveQueryParameters: z.array(z.string().trim().min(1).max(100)).max(64).optional()
})

export const adminActivateRevisionSchema = z.object({
  revisionId: z.uuid()
})

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
