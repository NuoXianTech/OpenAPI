import type { RateLimiter } from '~~/server/types/api-guard'
import { getRateLimiter } from '~~/server/utils/rate-limit/memory'

interface LoginRateLimitInput {
  namespace: string
  account: string
  ip: string
  accountLimit: number
  ipLimit: number
  limiter?: RateLimiter
}

interface LoginRateLimitError extends Error {
  statusCode: 429
}

function createLoginRateLimitError(): LoginRateLimitError {
  return Object.assign(new Error('尝试次数过多，请稍后再试'), {
    statusCode: 429 as const
  })
}

function normalizeBucketValue(value: string) {
  return value.trim().toLowerCase() || 'unknown'
}

export async function assertLoginRateLimit(input: LoginRateLimitInput) {
  const limiter = input.limiter ?? getRateLimiter()
  const accountKey = `${input.namespace}:account:${normalizeBucketValue(input.account)}`
  const ipKey = `${input.namespace}:ip:${normalizeBucketValue(input.ip)}`

  const accountResult = await limiter.consume(accountKey, input.accountLimit, 'minute')
  if (!accountResult.allowed) {
    throw createLoginRateLimitError()
  }

  const ipResult = await limiter.consume(ipKey, input.ipLimit, 'minute')
  if (!ipResult.allowed) {
    throw createLoginRateLimitError()
  }
}
