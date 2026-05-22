import type { H3Event } from 'h3'
import { and, eq } from 'drizzle-orm'
import { apis } from '@nuxthub/db/schema'
import { requireAuth } from '~~/server/utils/auth'

/**
 * 用户侧 · 获取所有可见接口（active + enabled），用于 API Key 创建表单
 * 的"接口范围"下拉选项。
 *
 * 返回字段：
 *   - scope：写入 apiKeys.scopes 的字符串，格式 `${pathVersion}.${code}`
 *   - 其它字段仅用于前端展示分组
 */
export default defineEventHandler(async (event: H3Event) => {
  await requireAuth(event)

  const rows = await db.select({
    id: apis.id,
    code: apis.code,
    pathVersion: apis.pathVersion,
    name: apis.name,
    apiPath: apis.apiPath,
    categoryId: apis.categoryId,
    httpMethod: apis.httpMethod
  })
    .from(apis)
    .where(and(eq(apis.isEnabled, true), eq(apis.status, 1)))
    .orderBy(apis.pathVersion, apis.code)

  return rows.map((r: typeof rows[number]) => ({
    id: r.id,
    scope: `${r.pathVersion}.${r.code}`,
    code: r.code,
    pathVersion: r.pathVersion,
    name: r.name,
    apiPath: r.apiPath,
    categoryId: r.categoryId,
    httpMethod: r.httpMethod
  }))
})
