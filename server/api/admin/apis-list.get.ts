import type { H3Event } from 'h3'
import { and, eq } from 'drizzle-orm'
import { apis } from '@nuxthub/db/schema'
import { requireAdmin } from '~~/server/utils/auth'

/**
 * 管理员侧 · 获取所有可见接口（active + enabled），用于 admin 给用户配置
 * API Key 时的"接口范围"下拉选项。与 user/apis-list 字段一致。
 */
export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)

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
