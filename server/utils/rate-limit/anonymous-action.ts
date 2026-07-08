import type { RateLimitWindow } from '~~/server/config/api-guard'
import type { RateLimiter } from '~~/server/types/api-guard'
import { getRateLimiter } from '~~/server/utils/rate-limit/memory'

interface AnonymousEmailIpRateLimitInput {
  namespace: string
  email: string
  ip: string | null
  emailLimit: number
  ipLimit: number
  emailWindow?: RateLimitWindow
  ipWindow?: RateLimitWindow
  limiter?: RateLimiter
}

function normalizeBucketValue(value: string) {
  return value.trim().toLowerCase() || 'unknown'
}

export async function canConsumeAnonymousEmailIpRateLimit(input: AnonymousEmailIpRateLimitInput): Promise<boolean> {
  const limiter = input.limiter ?? getRateLimiter()
  const emailWindow = input.emailWindow ?? 'minute'
  const ipWindow = input.ipWindow ?? 'hour'

  const emailResult = await limiter.consume(
    `${input.namespace}:email:${normalizeBucketValue(input.email)}`,
    input.emailLimit,
    emailWindow
  )
  if (!emailResult.allowed) {
    return false
  }

  if (!input.ip) {
    return true
  }

  const ipResult = await limiter.consume(
    `${input.namespace}:ip:${normalizeBucketValue(input.ip)}`,
    input.ipLimit,
    ipWindow
  )
  return ipResult.allowed
}
