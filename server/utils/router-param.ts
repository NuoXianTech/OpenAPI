import type { H3Event } from 'h3'
import { createError, getRouterParam } from 'h3'
import { z } from 'zod'

export function readUuidRouterParam(event: H3Event, name = 'id'): string {
  const value = z.uuid().safeParse(getRouterParam(event, name))
  if (!value.success) {
    throw createError({ statusCode: 400, message: `${name} is invalid` })
  }
  return value.data
}

export function readPositiveIntegerRouterParam(event: H3Event, name = 'id'): number {
  const value = z.coerce.number().int().positive().safeParse(getRouterParam(event, name))
  if (!value.success) {
    throw createError({ statusCode: 400, message: `${name} is invalid` })
  }
  return value.data
}
