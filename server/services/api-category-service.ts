import { and, asc, count, eq, isNull } from 'drizzle-orm'
import { createError } from 'h3'
import { apiCategories, apis } from '@nuxthub/db/schema'
import { firstRow } from '~~/server/utils/row'

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

export const apiCategoryService = {
  async listAll() {
    return db.select().from(apiCategories)
      .where(isNull(apiCategories.deletedAt))
      .orderBy(asc(apiCategories.sortOrder), asc(apiCategories.name))
  },

  async listEnabled() {
    return db.select().from(apiCategories)
      .where(and(isNull(apiCategories.deletedAt), eq(apiCategories.isEnabled, true)))
      .orderBy(asc(apiCategories.sortOrder), asc(apiCategories.name))
  },

  async getById(id: number) {
    const res = await db.select().from(apiCategories).where(eq(apiCategories.id, id)).limit(1)
    return firstRow(res)
  },

  async getByCode(code: string) {
    const res = await db.select().from(apiCategories).where(eq(apiCategories.code, code)).limit(1)
    return firstRow(res)
  },

  async create(input: ApiCategoryInput) {
    const code = input.code.trim()
    if (!code) throw createError({ statusCode: 400, message: 'code is required' })

    const existing = await this.getByCode(code)
    if (existing) throw createError({ statusCode: 409, message: 'category code already exists' })

    const res = await db.insert(apiCategories).values({
      code,
      name: input.name.trim(),
      description: input.description ?? null,
      icon: input.icon ?? null,
      color: input.color ?? null,
      parentId: input.parentId ?? null,
      sortOrder: input.sortOrder ?? 0,
      isEnabled: input.isEnabled ?? true
    }).returning()

    return res[0]
  },

  async update(id: number, patch: Partial<ApiCategoryInput>) {
    const { code: _code, ...rest } = patch
    const res = await db.update(apiCategories)
      .set({ ...rest, updatedAt: new Date() })
      .where(eq(apiCategories.id, id))
      .returning()
    return firstRow(res)
  },

  /** 统计绑定到该分类的接口数量（含已禁用 / orphan 接口） */
  async countBoundApis(id: number) {
    const [row] = await db.select({ value: count() }).from(apis).where(eq(apis.categoryId, id))
    return row?.value ?? 0
  },

  /**
   * 软删分类。删除前校验无接口绑定：只要仍有接口（含禁用 / orphan）的 categoryId
   * 指向该分类，就拒绝删除并提示 admin 先改这些接口的分类，避免接口悬挂在不可见分类上。
   */
  async softDelete(id: number) {
    const boundCount = await this.countBoundApis(id)
    if (boundCount > 0) {
      throw createError({
        statusCode: 409,
        message: `仍有 ${boundCount} 个接口绑定该分类，请先调整这些接口的分类后再删除`
      })
    }
    const res = await db.update(apiCategories)
      .set({ deletedAt: new Date(), isEnabled: false, updatedAt: new Date() })
      .where(eq(apiCategories.id, id))
      .returning()
    return firstRow(res)
  }
}
