import type { H3Event } from 'h3'
import { MAX_ZOD_BODY_BYTES } from '~~/server/utils/zod'

// Maximum request body size for control plane endpoints (10MB)
const CONTROL_PLANE_MAX_REQUEST_BYTES = MAX_ZOD_BODY_BYTES

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', async (event: H3Event) => {
    const path = event.path

    // Apply body size limit to control plane routes
    if (
      path.startsWith('/api/admin/')
      || path.startsWith('/api/user/')
      || path.startsWith('/api/auth/')
    ) {
      const contentLength = event.node.req.headers['content-length']
      if (contentLength) {
        const length = Number.parseInt(contentLength, 10)
        if (Number.isFinite(length) && length > CONTROL_PLANE_MAX_REQUEST_BYTES) {
          throw createError({
            statusCode: 413,
            statusMessage: 'Payload Too Large',
            message: `Request body exceeds ${CONTROL_PLANE_MAX_REQUEST_BYTES} bytes`
          })
        }
      }

      // Set a streaming read limit
      if (!event.context.__bodyLimitSet) {
        event.context.__bodyLimitSet = true
        event.context.__maxBodySize = CONTROL_PLANE_MAX_REQUEST_BYTES
      }
    }
  })
})
