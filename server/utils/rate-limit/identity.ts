import type { RateLimitWindow } from '~~/server/config/api-access'
import type { RateLimiter } from '~~/server/types/api-access'
import { getRateLimiter } from '~~/server/utils/rate-limit'

interface IdentityRateLimitBucket {
  name: string
  value: string | null | undefined
  limit: number
  window: RateLimitWindow
}

interface IdentityRateLimitInput {
  namespace: string
  buckets: IdentityRateLimitBucket[]
  limiter?: RateLimiter
}

function normalizeBucketValue(value: string): string {
  return value.trim().toLowerCase() || 'unknown'
}

export async function canConsumeIdentityRateLimit(input: IdentityRateLimitInput): Promise<boolean> {
  const limiter = input.limiter ?? getRateLimiter()
  const buckets = input.buckets.filter(
    (bucket): bucket is IdentityRateLimitBucket & { value: string } => typeof bucket.value === 'string'
  )
  const results = await Promise.all(buckets.map(bucket => limiter.consume(
    `${input.namespace}:${bucket.name}:${normalizeBucketValue(bucket.value)}`,
    bucket.limit,
    bucket.window
  )))

  return results.every(result => result.allowed)
}
