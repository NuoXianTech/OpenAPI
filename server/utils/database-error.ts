export function getSqlState(error: unknown): string | undefined {
  const visited = new Set<object>()
  let current = error

  while (current && typeof current === 'object' && !visited.has(current)) {
    visited.add(current)
    const code = 'code' in current ? current.code : undefined
    if (typeof code === 'string') return code
    current = 'cause' in current ? current.cause : undefined
  }

  return undefined
}
