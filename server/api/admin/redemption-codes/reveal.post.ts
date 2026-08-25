import { createError } from 'h3'
import { idSchema } from '~~/server/schemas/common'
import { redemptionService } from '~~/server/services/redemption-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event, admin) => {
  const { id } = await readZodBody(event, idSchema)
  const revealed = await redemptionService.reveal(id)

  if (!revealed) {
    throw createError({ statusCode: 404, message: '兑换码不存在' })
  }

  // `admin.redemption-code.reveal` 是 gate 级审计：写入失败会抛错，明文不会在无痕的情况下交付。
  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.redemption-code.reveal',
    resourceType: 'redemption-code',
    resourceId: revealed.id
  })

  return revealed
})
