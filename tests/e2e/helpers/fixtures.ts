export function createUniqueSuffix(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function createApiPayload() {
  const suffix = createUniqueSuffix('api')

  return {
    code: suffix,
    name: `API ${suffix}`,
    status: 1,
    categoryId: null,
    shortDesc: `Short ${suffix}`,
    description: `Description ${suffix}`,
    httpMethod: 'GET',
    apiPath: `/api/e2e/${suffix}`,
    docUrl: `/docs/${suffix}`,
    isEnabled: true,
    isApiKey: false,
    isStatistics: true,
    rateLimitPerMinute: 0,
  }
}

export function createFriendLinkPayload() {
  const suffix = createUniqueSuffix('link')

  return {
    title: `Friend ${suffix}`,
    url: `https://${suffix}.example.test`,
    description: `Description ${suffix}`,
    isActive: true,
  }
}

export function createRegisterPayload() {
  const suffix = createUniqueSuffix('user')

  return {
    username: suffix,
    email: `${suffix}@example.test`,
    password: 'Passw0rd!2026',
  }
}
