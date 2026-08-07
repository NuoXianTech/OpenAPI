import { and, asc, count, eq, isNull } from 'drizzle-orm'
import { db } from '~~/server/db/client'
import { apiCategories, apis } from '~~/server/db/schema'
import { createApplicationError } from '~~/server/errors/application-error'
import type { ApiCategoryItem } from '#shared/types/api'
import { getSqlState } from '~~/server/utils/database-error'
import { deleteSharedCache, getSharedCache } from '~~/server/utils/shared-cache'
import { firstRow } from '~~/server/utils/row'

const PUBLIC_API_CATEGORIES_CACHE_KEY = 'cache:public:api-categories'
const PUBLIC_API_CATEGORIES_TTL_SECONDS = 60

function invalidatePublicApiCategories(): Promise<void> {
  return deleteSharedCache([PUBLIC_API_CATEGORIES_CACHE_KEY])
}

export interface ApiCategoryInput {
  code: string
  name: string
  description?: string | null
  icon?: string | null
  color?: string | null
  parentId?: number | null
  sortOrder?: number
  isEnabled?: boolean
}

async function findCategoryByCode(code: string) {
  const rows = await db.select().from(apiCategories).where(eq(apiCategories.code, code)).limit(1)
  return firstRow(rows)
}

async function countBoundApis(categoryId: number): Promise<number> {
  const [row] = await db.select({ value: count() }).from(apis).where(eq(apis.categoryId, categoryId))
  return row?.value ?? 0
}

async function validateParent(parentId: number | null | undefined, categoryId?: number) {
  if (parentId === undefined || parentId === null) return
  const seen = new Set<number>(categoryId ? [categoryId] : [])
  let currentId: number | null = parentId
  while (currentId !== null) {
    if (seen.has(currentId)) throw createApplicationError({ statusCode: 400, message: 'category parent cycle is not allowed' })
    seen.add(currentId)
    const parent = await db.select({ parentId: apiCategories.parentId, deletedAt: apiCategories.deletedAt })
      .from(apiCategories)
      .where(eq(apiCategories.id, currentId))
      .limit(1)
    if (!parent[0] || parent[0].deletedAt) {
      throw createApplicationError({ statusCode: 400, message: 'parent category not found or deleted' })
    }
    currentId = parent[0].parentId
  }
}

export const apiCategoryService = {
  async listAll() {
    return db.select().from(apiCategories)
      .where(isNull(apiCategories.deletedAt))
      .orderBy(asc(apiCategories.sortOrder), asc(apiCategories.name))
  },

  async listEnabled(): Promise<ApiCategoryItem[]> {
    return getSharedCache<ApiCategoryItem[]>({
      key: PUBLIC_API_CATEGORIES_CACHE_KEY,
      ttlSeconds: PUBLIC_API_CATEGORIES_TTL_SECONDS,
      async loader() {
        const rows = await db.select().from(apiCategories)
          .where(and(isNull(apiCategories.deletedAt), eq(apiCategories.isEnabled, true)))
          .orderBy(asc(apiCategories.sortOrder), asc(apiCategories.name))

        return rows.map(row => ({
          id: row.id,
          code: row.code,
          name: row.name,
          icon: row.icon,
          color: row.color,
          sortOrder: row.sortOrder,
          isEnabled: row.isEnabled
        }))
      }
    })
  },

  async create(input: ApiCategoryInput) {
    const code = input.code.trim()
    if (!code) throw createApplicationError({ statusCode: 400, message: 'code is required' })

    const existing = await findCategoryByCode(code)
    if (existing) throw createApplicationError({ statusCode: 409, message: 'category code already exists' })
    await validateParent(input.parentId)

    let res: Array<typeof apiCategories.$inferSelect>
    try {
      res = await db.insert(apiCategories).values({
        code,
        name: input.name.trim(),
        description: input.description ?? null,
        icon: input.icon ?? null,
        color: input.color ?? null,
        parentId: input.parentId ?? null,
        sortOrder: input.sortOrder ?? 0,
        isEnabled: input.isEnabled ?? true
      }).returning()
    } catch (error) {
      if (getSqlState(error) !== '23505') throw error
      throw createApplicationError({ statusCode: 409, message: 'category code already exists' })
    }

    const created = res[0]
    if (created) await invalidatePublicApiCategories()
    return created
  },

  async update(id: number, patch: Partial<ApiCategoryInput>) {
    const { code: _code, ...rest } = patch
    await validateParent(rest.parentId, id)
    const res = await db.update(apiCategories)
      .set({ ...rest, updatedAt: new Date() })
      .where(eq(apiCategories.id, id))
      .returning()
    const updated = firstRow(res)
    if (updated) await invalidatePublicApiCategories()
    return updated
  },

  /**
   * 软删分类。删除前校验无接口绑定：只要仍有接口（含禁用 / orphan）的 categoryId
   * 指向该分类，就拒绝删除并提示 admin 先改这些接口的分类，避免接口悬挂在不可见分类上。
   */
  async softDelete(id: number) {
    const boundCount = await countBoundApis(id)
    if (boundCount > 0) {
      throw createApplicationError({
        statusCode: 409,
        message: `仍有 ${boundCount} 个接口绑定该分类，请先调整这些接口的分类后再删除`
      })
    }
    const res = await db.update(apiCategories)
      .set({ deletedAt: new Date(), isEnabled: false, updatedAt: new Date() })
      .where(eq(apiCategories.id, id))
      .returning()
    const deleted = firstRow(res)
    if (deleted) await invalidatePublicApiCategories()
    return deleted
  }
}
