import { and, asc, eq, isNull } from 'drizzle-orm'
import { db } from '~~/server/db/client'
import { apiProducts, apiVersions } from '~~/server/db/schema'
import { createApplicationError } from '~~/server/errors/application-error'
import { getSqlState } from '~~/server/utils/database-error'
import { firstRow } from '~~/server/utils/row'

interface CreateProductInput {
  workspaceId: string
  slug: string
  name: string
  summary?: string
  description?: string
  visibility: 'public' | 'private'
  version: string
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

    const result = new Map<string, typeof apiProducts.$inferSelect & { versions: Array<typeof apiVersions.$inferSelect> }>()
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
        const publishedAt = new Date()
        const product = firstRow(await tx.insert(apiProducts).values({
          workspaceId: input.workspaceId,
          slug: input.slug,
          name: input.name,
          summary: input.summary ?? '',
          description: input.description ?? '',
          visibility: input.visibility
        }).returning())
        if (!product) throw new Error('product insert returned no row')

        const version = firstRow(await tx.insert(apiVersions).values({
          productId: product.id,
          version: input.version,
          state: 'published',
          publishedAt
        }).returning())
        if (!version) throw new Error('version insert returned no row')
        return { ...product, versions: [version] }
      })
    } catch (error) {
      if (getSqlState(error) === '23505') {
        throw createApplicationError({
          statusCode: 409,
          message: 'product slug or version already exists',
          data: { code: 'PRODUCT_CONFLICT' }
        })
      }
      if (getSqlState(error) === '23503') {
        throw createApplicationError({
          statusCode: 404,
          message: 'workspace not found',
          data: { code: 'WORKSPACE_NOT_FOUND' }
        })
      }
      throw error
    }
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
