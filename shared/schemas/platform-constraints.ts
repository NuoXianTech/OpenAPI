import { z } from 'zod'

/**
 * Shared platform constraints and validation schemas.
 * These define the transmission contract and hard limits enforced by both
 * frontend and backend. Business rules remain in service layers.
 */

// Common patterns
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const slugSchema = z.string().trim().min(1).max(80).regex(slugPattern)
export const nameSchema = z.string().trim().min(1).max(160)
export const hostSchema = z.string().trim().min(1).max(253)
export const pathSchema = z.string().trim().min(1).max(1000).startsWith('/')
export const httpMethodSchema = z.enum(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'])

// Upstream constraints
export const UPSTREAM_CONSTRAINTS = {
  TARGET_MAX_COUNT: 32,
  TARGET_WEIGHT_MIN: 1,
  TARGET_WEIGHT_MAX: 10_000,
  TARGET_URL_MAX_LENGTH: 2000,
  SERVICE_TOKEN_MIN_LENGTH: 32,
  SERVICE_TOKEN_MAX_LENGTH: 4096
} as const

// Route constraints
export const ROUTE_CONSTRAINTS = {
  HOST_MAX_COUNT: 32,
  TIMEOUT_MS_MIN: 100,
  TIMEOUT_MS_MAX: 120_000,
  REQUEST_BYTES_MAX: 1024 * 1024 * 1024, // 1GB
  RESPONSE_BYTES_MAX: 2_147_483_647, // 2GB (int32 max)
  CREDITS_COST_MAX: 1_000_000,
  RATE_LIMIT_SECOND_MAX: 1_000_000,
  RATE_LIMIT_MINUTE_MAX: 10_000_000,
  RATE_LIMIT_HOUR_MAX: 100_000_000,
  RATE_LIMIT_DAY_MAX: 1_000_000_000,
  SENSITIVE_PARAMS_MAX_COUNT: 64,
  SENSITIVE_PARAM_MAX_LENGTH: 100
} as const

// Content length constraints
export const CONTENT_CONSTRAINTS = {
  PRODUCT_SUMMARY_MAX_LENGTH: 300,
  PRODUCT_DESCRIPTION_MAX_LENGTH: 20_000,
  VERSION_CHANGELOG_MAX_LENGTH: 20_000,
  AUDIT_DETAIL_MAX_BYTES: 50_000,
  NOTIFICATION_CONTENT_MAX_LENGTH: 10_000,
  ANNOUNCEMENT_CONTENT_MAX_LENGTH: 50_000
} as const

// Target schemas
export const targetBaseUrlSchema = z.string().url().max(UPSTREAM_CONSTRAINTS.TARGET_URL_MAX_LENGTH)
export const targetWeightSchema = z.coerce.number().int()
  .min(UPSTREAM_CONSTRAINTS.TARGET_WEIGHT_MIN)
  .max(UPSTREAM_CONSTRAINTS.TARGET_WEIGHT_MAX)

// Route limit schemas
export const routeTimeoutSchema = z.coerce.number().int()
  .min(ROUTE_CONSTRAINTS.TIMEOUT_MS_MIN)
  .max(ROUTE_CONSTRAINTS.TIMEOUT_MS_MAX)

export const routeRequestBytesSchema = z.coerce.number().int()
  .min(0)
  .max(ROUTE_CONSTRAINTS.REQUEST_BYTES_MAX)

export const routeResponseBytesSchema = z.coerce.number().int()
  .min(0)
  .max(ROUTE_CONSTRAINTS.RESPONSE_BYTES_MAX)

export const routeCreditsCostSchema = z.coerce.number().int()
  .min(0)
  .max(ROUTE_CONSTRAINTS.CREDITS_COST_MAX)

export const routeRateLimitPerSecondSchema = z.coerce.number().int()
  .min(0)
  .max(ROUTE_CONSTRAINTS.RATE_LIMIT_SECOND_MAX)

export const routeRateLimitPerMinuteSchema = z.coerce.number().int()
  .min(0)
  .max(ROUTE_CONSTRAINTS.RATE_LIMIT_MINUTE_MAX)

export const routeRateLimitPerHourSchema = z.coerce.number().int()
  .min(0)
  .max(ROUTE_CONSTRAINTS.RATE_LIMIT_HOUR_MAX)

export const routeRateLimitPerDaySchema = z.coerce.number().int()
  .min(0)
  .max(ROUTE_CONSTRAINTS.RATE_LIMIT_DAY_MAX)
