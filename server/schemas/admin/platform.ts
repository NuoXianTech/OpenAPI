import { z } from 'zod'

const slugSchema = z.string().trim().min(1).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
const nameSchema = z.string().trim().min(1).max(160)
const hostSchema = z.string().trim().min(1).max(253)
const pathSchema = z.string().trim().min(1).max(1000).startsWith('/')
const httpMethodSchema = z.enum(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'])

export const adminCreateWorkspaceSchema = z.object({
  slug: slugSchema,
  name: nameSchema,
  environment: z.object({
    slug: slugSchema.default('development'),
    name: nameSchema.default('Development'),
    defaultDomain: hostSchema.nullable().optional()
  }).optional()
})

export const adminCreateProductSchema = z.object({
  workspaceId: z.uuid(),
  slug: slugSchema,
  name: nameSchema,
  summary: z.string().trim().max(300).optional(),
  description: z.string().trim().max(20_000).optional(),
  visibility: z.enum(['public', 'private']).default('public'),
  version: z.string().trim().min(1).max(80).default('v1')
})

export const adminCreateUpstreamSchema = z.object({
  workspaceId: z.uuid(),
  slug: slugSchema,
  name: nameSchema,
  kind: z.enum(['internal', 'external']),
  serviceToken: z.string().trim().min(32).max(4096).optional(),
  loadBalancing: z.enum(['round_robin', 'weighted']).default('round_robin'),
  targets: z.array(z.object({
    baseUrl: z.url().max(2000),
    weight: z.coerce.number().int().min(1).max(10_000).default(1)
  })).min(1).max(32)
}).superRefine((value, context) => {
  if (value.kind === 'internal' && !value.serviceToken) {
    context.addIssue({
      code: 'custom',
      path: ['serviceToken'],
      message: 'Internal Upstream 必须配置至少 32 字符的 Service Token'
    })
  }
})

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
  environmentId: z.uuid(),
  upstreamServiceId: z.uuid(),
  method: httpMethodSchema,
  path: pathSchema
})

export const adminUpdateEndpointPublicationSchema = z.object({
  environmentId: z.uuid(),
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
  maxResponseBytes: z.coerce.number().int().min(0).max(2_147_483_647).optional()
})

export const adminPublishRevisionSchema = z.object({
  environmentId: z.uuid()
})

export const adminActivateRevisionSchema = z.object({
  environmentId: z.uuid(),
  revisionId: z.uuid()
})
