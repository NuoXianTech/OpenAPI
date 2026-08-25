import { z } from 'zod'
import { platformProductService } from '~~/server/services/platform-product-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { toPlatformProduct } from '~~/server/utils/platform-view'
import { parseZodQuery } from '~~/server/utils/zod'

const querySchema = z.object({ workspaceId: z.uuid().optional() })

export default defineAdminEventHandler(async (event) => {
  const { workspaceId } = parseZodQuery(event, querySchema)
  return (await platformProductService.list(workspaceId)).map(toPlatformProduct)
})
