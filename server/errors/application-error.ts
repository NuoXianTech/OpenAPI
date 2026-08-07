export interface ApplicationErrorOptions {
  statusCode: number
  message: string
  data?: unknown
}

/** Application-layer failure that Nitro can translate at the HTTP boundary. */
export class ApplicationError extends Error {
  readonly statusCode: number
  readonly data?: unknown

  constructor(options: ApplicationErrorOptions) {
    super(options.message)
    this.name = 'ApplicationError'
    this.statusCode = options.statusCode
    this.data = options.data
  }
}

export function createApplicationError(options: ApplicationErrorOptions): ApplicationError {
  return new ApplicationError(options)
}
