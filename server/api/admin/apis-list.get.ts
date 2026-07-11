import type { H3Event } from 'h3'
import { and, eq } from 'drizzle-orm'
import { apis } from '~~/server/db/schema'
import { defineAdminEventHandler } from '~~/server/utils/auth'

/**
 * 管理员侧 · 获取所有"已启用且非 orphan"的接口（仅看 isEnabled），用于 admin 给用户配置
 * API Key 时的"接口范围"下拉选项。与 user/apis-list 字段一致。
 *
 * 不再按 status=1 过滤：status 是运行状态（维护/废弃/未知），不应限制 Key 配置面。
 * orphan 接口（源文件已被物理删除）自动被 isEnabled=false 排除。
 */
export default defineAdminEventHandler(async (_event: H3Event) => {
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
    .where(and(eq(apis.isEnabled, true), eq(apis.isOrphaned, false)))
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
