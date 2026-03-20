import type { H3Event } from 'h3'
import { apiService } from '~~/server/service/apiService'

export default defineEventHandler(async (event: H3Event) => {
  const body = await readBody(event)

  const addData = await apiService.addApi(
    body.userid ?? null,
    {
      apiId: body.apiId,
      name: body.name,
      status: body.status,
      shortDesc: body.short_desc,
      description: body.description,
      httpMethod: body.http_method,
      apiPath: body.api_path,
      docUrl: body.doc_url,
      isEnabled: body.is_enabled,
      isApiKey: body.is_api_key,
      isStatistics: body.is_statistics,
    },
  )

  return report(event, 200, '新增接口成功！', addData)
})
