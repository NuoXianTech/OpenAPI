import type { H3Event } from 'h3'
import { listMusicProviders } from '~~/server/lib/music/client'
import { openApiOk } from '~~/server/utils/open-api-response'
import { getEnabledMusicPlatforms } from '~~/server/lib/music/capability-config'

async function handleMusicProviders(event: H3Event) {
  const enabledPlatforms = await getEnabledMusicPlatforms()
  const items = listMusicProviders().filter(provider => enabledPlatforms.has(provider.code))
  return openApiOk(event, { items, total: items.length })
}

export default defineEventHandler(handleMusicProviders)
