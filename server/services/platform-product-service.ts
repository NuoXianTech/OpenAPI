import { and, asc, count, eq, isNull } from 'drizzle-orm'
import { db } from '~~/server/db/client'
import { apiProducts, apiRoutes, apiVersions } from '~~/server/db/schema'
import { createApplicationError } from '~~/server/errors/application-error'
import { routingReferenceService } from '~~/server/services/routing-reference-service'
import { getSqlState } from '~~/server/utils/database-error'
import { firstRow } from '~~/server/utils/row'

interface CreateProductInput {
  workspaceId: string
  slug: string
  name: string
  summary?: string
  description?: string
  categoryId?: number | null
  visibility: 'public' | 'private'
  version: string
}

interface UpdateProductInput {
  slug?: string
  name?: string
  summary?: string
  description?: string
  categoryId?: number | null
  visibility?: 'public' | 'private'
  lifecycle?: 'active' | 'deprecated' | 'retired'
}

interface CreateVersionInput {
  productId: string
  version: string
  state: 'draft' | 'published' | 'deprecated' | 'retired'
  changelog: string
}

interface UpdateVersionInput {
  version?: string
  state?: 'draft' | 'published' | 'deprecated' | 'retired'
  changelog?: string
}

function conflict(message: string) {
  return createApplicationError({
    statusCode: 409,
    message,
    data: { code: 'PRODUCT_CONFLICT' }
  })
}

function lifecycleDates(state: CreateVersionInput['state'], now = new Date()) {
  return {
    publishedAt: ['published', 'deprecated', 'retired'].includes(state) ? now : null,
    deprecatedAt: ['deprecated', 'retired'].includes(state) ? now : null,
    retiredAt: state === 'retired' ? now : null
  }
}

export const platformProductService = {
  async list(workspaceId?: string) {
    const rows = await db.select({ product: apiProducts, version: apiVersions })
      .from(apiProducts)
      .leftJoin(apiVersions, eq(apiVersions.productId, apiProducts.id))
      .where(and(
        isNull(apiProducts.deletedAt),
        workspaceId ? eq(apiProducts.workspaceId, workspaceId) : undefined
      ))
      .orderBy(asc(apiProducts.name), asc(apiVersions.version))

    const result = new Map<string, typeof apiProducts.$inferSelect & {
      versions: Array<typeof apiVersions.$inferSelect>
    }>()
    for (const row of rows) {
      const item = result.get(row.product.id) ?? { ...row.product, versions: [] }
      if (row.version) item.versions.push(row.version)
      result.set(row.product.id, item)
    }
    return Array.from(result.values())
  },

  async create(input: CreateProductInput) {
    try {
      return await db.transaction(async (tx) => {
        const now = new Date()
        const product = firstRow(await tx.insert(apiProducts).values({
          workspaceId: input.workspaceId,
          slug: input.slug,
          name: input.name,
          summary: input.summary ?? '',
          description: input.description ?? '',
          categoryId: input.categoryId ?? null,
          visibility: input.visibility
        }).returning())
        if (!product) throw new Error('product insert returned no row')

        const version = firstRow(await tx.insert(apiVersions).values({
          productId: product.id,
          version: input.version,
          state: 'published',
          ...lifecycleDates('published', now)
        }).returning())
        if (!version) throw new Error('version insert returned no row')
        return { ...product, versions: [version] }
      })
    } catch (error) {
      if (getSqlState(error) === '23505') throw conflict('product slug or version already exists')
      if (getSqlState(error) === '23503') {
        throw createApplicationError({ statusCode: 404, message: 'workspace or category not found', data: { code: 'PRODUCT_PARENT_NOT_FOUND' } })
      }
      throw error
    }
  },

  async update(id: string, input: UpdateProductInput) {
    try {
      const updated = firstRow(await db.update(apiProducts).set({
        ...input,
        updatedAt: new Date()
      }).where(and(eq(apiProducts.id, id), isNull(apiProducts.deletedAt))).returning())
      if (!updated) {
        throw createApplicationError({ statusCode: 404, message: 'product not found', data: { code: 'PRODUCT_NOT_FOUND' } })
      }
      return updated
    } catch (error) {
      if (getSqlState(error) === '23505') throw conflict('product slug already exists')
      if (getSqlState(error) === '23503') {
        throw createApplicationError({ statusCode: 404, message: 'category not found', data: { code: 'CATEGORY_NOT_FOUND' } })
      }
      throw error
    }
  },

  async remove(id: string) {
    if (await routingReferenceService.hasProduct(id)) {
      throw createApplicationError({
        statusCode: 409,
        message: 'product is still referenced by an active routing revision',
        data: { code: 'PRODUCT_STILL_PUBLISHED' }
      })
    }
    const routeCount = firstRow(await db.select({ value: count() })
      .from(apiRoutes)
      .innerJoin(apiVersions, eq(apiVersions.id, apiRoutes.apiVersionId))
      .where(and(eq(apiVersions.productId, id), isNull(apiRoutes.deletedAt))))
    if (Number(routeCount?.value ?? 0) > 0) {
      throw createApplicationError({
        statusCode: 409,
        message: 'remove every route before deleting the product',
        data: { code: 'PRODUCT_HAS_ROUTES' }
      })
    }
    const now = new Date()
    const removed = firstRow(await db.update(apiProducts).set({
      lifecycle: 'retired',
      deletedAt: now,
      updatedAt: now
    }).where(and(eq(apiProducts.id, id), isNull(apiProducts.deletedAt))).returning())
    if (!removed) {
      throw createApplicationError({ statusCode: 404, message: 'product not found', data: { code: 'PRODUCT_NOT_FOUND' } })
    }
    return removed
  },

  async createVersion(input: CreateVersionInput) {
    try {
      const product = firstRow(await db.select().from(apiProducts)
        .where(and(eq(apiProducts.id, input.productId), isNull(apiProducts.deletedAt)))
        .limit(1))
      if (!product) {
        throw createApplicationError({ statusCode: 404, message: 'product not found', data: { code: 'PRODUCT_NOT_FOUND' } })
      }
      const version = firstRow(await db.insert(apiVersions).values({
        productId: input.productId,
        version: input.version,
        state: input.state,
        changelog: input.changelog,
        ...lifecycleDates(input.state)
      }).returning())
      if (!version) throw new Error('version insert returned no row')
      return { version, workspaceId: product.workspaceId }
    } catch (error) {
      if (getSqlState(error) === '23505') throw conflict('version already exists for this product')
      throw error
    }
  },

  async updateVersion(id: string, input: UpdateVersionInput) {
    const current = firstRow(await db.select({
      version: apiVersions,
      workspaceId: apiProducts.workspaceId
    }).from(apiVersions)
      .innerJoin(apiProducts, eq(apiProducts.id, apiVersions.productId))
      .where(and(eq(apiVersions.id, id), isNull(apiProducts.deletedAt)))
      .limit(1))
    if (!current) {
      throw createApplicationError({ statusCode: 404, message: 'version not found', data: { code: 'VERSION_NOT_FOUND' } })
    }
    const timestampPatch = input.state
      ? lifecycleDates(input.state)
      : {}
    try {
      const version = firstRow(await db.update(apiVersions).set({
        ...input,
        ...timestampPatch
      }).where(eq(apiVersions.id, id)).returning())
      if (!version) throw new Error('version update returned no row')
      return { version, workspaceId: current.workspaceId }
    } catch (error) {
      if (getSqlState(error) === '23505') throw conflict('version already exists for this product')
      throw error
    }
  },

  async removeVersion(id: string) {
    if (await routingReferenceService.hasVersion(id)) {
      throw createApplicationError({
        statusCode: 409,
        message: 'version is still referenced by an active routing revision',
        data: { code: 'VERSION_STILL_PUBLISHED' }
      })
    }
    const current = firstRow(await db.select({
      version: apiVersions,
      workspaceId: apiProducts.workspaceId
    }).from(apiVersions)
      .innerJoin(apiProducts, eq(apiProducts.id, apiVersions.productId))
      .where(eq(apiVersions.id, id)).limit(1))
    if (!current) {
      throw createApplicationError({ statusCode: 404, message: 'version not found', data: { code: 'VERSION_NOT_FOUND' } })
    }
    const routeCount = firstRow(await db.select({ value: count() })
      .from(apiRoutes).where(and(
        eq(apiRoutes.apiVersionId, id),
        isNull(apiRoutes.deletedAt)
      )))
    if (Number(routeCount?.value ?? 0) > 0) {
      throw createApplicationError({
        statusCode: 409,
        message: 'version still owns routes',
        data: { code: 'VERSION_HAS_ROUTES' }
      })
    }
    await db.delete(apiVersions).where(eq(apiVersions.id, id))
    return { version: current.version, workspaceId: current.workspaceId }
  },

  async findVersionWorkspace(apiVersionId: string) {
    return firstRow(await db.select({
      version: apiVersions,
      product: apiProducts
    }).from(apiVersions)
      .innerJoin(apiProducts, and(eq(apiProducts.id, apiVersions.productId), isNull(apiProducts.deletedAt)))
      .where(eq(apiVersions.id, apiVersionId))
      .limit(1))
  }
}
