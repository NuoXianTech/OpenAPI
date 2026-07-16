let cachedAuthSecret: string | undefined

export function getAuthSecret(): string {
  if (cachedAuthSecret) return cachedAuthSecret

  const secret = useRuntimeConfig().auth.secret as string
  if (Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('NUXT_AUTH_SECRET must contain at least 32 bytes')
  }

  cachedAuthSecret = secret
  return cachedAuthSecret
}
