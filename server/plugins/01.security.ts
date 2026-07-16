import type { H3Event } from 'h3'
import { removeResponseHeader } from 'h3'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('beforeResponse', (event: H3Event) => {
    removeResponseHeader(event, 'X-Powered-By')
  })
})
