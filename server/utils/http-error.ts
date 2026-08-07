import { createError, type H3Error } from 'h3'
import { ApplicationError } from '~~/server/errors/application-error'

export function toHttpError(error: ApplicationError): H3Error
export function toHttpError(error: unknown): unknown
export function toHttpError(error: unknown): unknown {
  if (!(error instanceof ApplicationError)) return error

  return createError({
    statusCode: error.statusCode,
    message: error.message,
    data: error.data,
    cause: error
  })
}
