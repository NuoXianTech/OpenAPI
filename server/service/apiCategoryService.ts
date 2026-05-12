import { and, asc, eq, isNull } from 'drizzle-orm'
import { createError } from 'h3'
import { apiCategories } from '@nuxthub/db/schema'

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
    return res[0] || null
  },

  async getByCode(code: string) {
    const res = await db.select().from(apiCategories).where(eq(apiCategories.code, code)).limit(1)
    return res[0] || null
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
    return res[0] || null
  },

  async softDelete(id: number) {
    const res = await db.update(apiCategories)
      .set({ deletedAt: new Date(), isEnabled: false, updatedAt: new Date() })
      .where(eq(apiCategories.id, id))
      .returning()
    return res[0] || null
  }
}
