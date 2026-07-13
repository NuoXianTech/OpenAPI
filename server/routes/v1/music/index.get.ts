import type { H3Event } from 'h3'
import { listMusicProviders } from '~~/server/lib/music/client'
import { openApiOk } from '~~/server/utils/open-api-response'

function handleMusicProviders(event: H3Event) {
  const items = listMusicProviders()
  return openApiOk(event, { items, total: items.length })
}

export default defineEventHandler(handleMusicProviders)
