import type { H3Event } from 'h3'
import type { AppEventContext } from '~~/server/types/api-guard'

export type OpenApiEventContext = H3Event['context'] & AppEventContext

/** Narrows Nitro's generic event context to fields owned by this application. */
export function getAppEventContext(event: H3Event): OpenApiEventContext {
  return event.context as OpenApiEventContext
}
