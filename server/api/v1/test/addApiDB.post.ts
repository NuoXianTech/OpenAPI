import type { H3Event } from 'h3'
import { apiService } from '~~/server/service/apiService'

export default defineEventHandler(async (event: H3Event) => {
  const body = await readBody(event)

  const addData = await apiService.addApi(
    body.userid,
    body.code,
    body.name,
    body.status,
    body.short_desc,
    body.description,
    body.http_method,
    body.api_path,
    body.doc_url,
    body.is_enabled,
    body.is_api_key,
    body.is_statistics,
  )

  return report(event, 200, '新增接口成功！', addData)
})
