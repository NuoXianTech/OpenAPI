export function getAuthSecret(): string {
  const secret = useRuntimeConfig().auth.secret as string
  if (Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('NUXT_AUTH_SECRET must contain at least 32 bytes')
  }
  return secret
}
