import type { H3Event } from 'h3'
import { authPolicyService } from '~~/server/service/authPolicyService'
import { requireAdmin } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  requireAdmin(event)
  const policy = await authPolicyService.getPolicy()
  return {
    code: 0,
    msg: 'ok',
    data: policy,
  }
})
