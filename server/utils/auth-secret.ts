export function getAuthSecret(): string {
  const secret = useRuntimeConfig().auth.secret as string
  if (!secret) {
    throw new Error('auth.secret is not configured')
  }
  return secret
}
