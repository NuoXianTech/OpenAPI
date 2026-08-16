export function hostCookieName(name: string): string {
  return process.env.NODE_ENV === 'production' ? `__Host-${name}` : name
}

export function hostCookieSecurityOptions() {
  return {
    path: '/' as const,
    secure: process.env.NODE_ENV === 'production'
  }
}
