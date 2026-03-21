import type { H3Event } from 'h3'
import { apiService } from '~~/server/service/apiService'
import { report } from '~~/server/utils/report'

export default defineEventHandler(async (event: H3Event) => {
  const data = await apiService.listPublicApis()

  return report(event, 200, '接口列表获取成功！', data)
})