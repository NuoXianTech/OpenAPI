import { isError } from 'h3'
import { describe, expect, it } from 'vitest'
import { ApplicationError, createApplicationError } from '~~/server/errors/application-error'
import { toHttpError } from '~~/server/utils/http-error'

describe('ApplicationError', () => {
  it('preserves the application error contract without an HTTP framework dependency', () => {
    const error = createApplicationError({
      statusCode: 409,
      message: 'resource already exists',
      data: { resourceId: 7 }
    })

    expect(error).toBeInstanceOf(ApplicationError)
    expect(error).toBeInstanceOf(Error)
    expect(error).toMatchObject({
      name: 'ApplicationError',
      statusCode: 409,
      message: 'resource already exists',
      data: { resourceId: 7 }
    })
  })

  it('converts application failures into handled HTTP errors at the boundary', () => {
    const applicationError = createApplicationError({
      statusCode: 409,
      message: 'resource already exists',
      data: { resourceId: 7 }
    })

    const error = toHttpError(applicationError)

    expect(isError(error)).toBe(true)
    expect(error).toMatchObject({
      statusCode: 409,
      message: 'resource already exists',
      data: { resourceId: 7 },
      cause: applicationError,
      unhandled: false
    })
  })

  it('does not reclassify unexpected failures', () => {
    const error = new Error('database unavailable')

    expect(toHttpError(error)).toBe(error)
  })
})
