export class BillingPersistenceError extends Error {
  constructor(cause: unknown) {
    super('billing outcome could not be persisted', { cause })
    this.name = 'BillingPersistenceError'
  }
}

export class GatewayExecutionError extends Error {
  readonly status: number
  readonly code: string
  readonly publicMessage: string

  constructor(status: number, code: string, publicMessage: string) {
    super(publicMessage)
    this.name = 'GatewayExecutionError'
    this.status = status
    this.code = code
    this.publicMessage = publicMessage
  }
}

function wrappedError<TError extends Error>(
  error: unknown,
  match: (value: unknown) => value is TError
): TError | null {
  const seen = new Set<unknown>()
  let current: unknown = error
  while (current && !seen.has(current)) {
    if (match(current)) return current
    seen.add(current)
    if (typeof current !== 'object' || !('cause' in current)) return null
    current = current.cause
  }
  return null
}

export function findGatewayExecutionError(
  error: unknown
): GatewayExecutionError | null {
  return wrappedError(
    error,
    (value): value is GatewayExecutionError => (
      value instanceof GatewayExecutionError
    )
  )
}

export function findBillingPersistenceError(
  error: unknown
): BillingPersistenceError | null {
  return wrappedError(
    error,
    (value): value is BillingPersistenceError => (
      value instanceof BillingPersistenceError
    )
  )
}
