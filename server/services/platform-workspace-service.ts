import { and, asc, count, eq, inArray } from 'drizzle-orm'
import { db, type DatabaseTransaction } from '~~/server/db/client'
import {
  apiProducts,
  environments,
  openapiDocuments,
  routingRevisions,
  upstreamServices,
  workspaces
} from '~~/server/db/schema'
import { createApplicationError } from '~~/server/errors/application-error'
import { invalidatePublicApiCatalogCache } from '~~/server/services/api-catalog-service'
import { invalidateRoutingRuntimeCache } from '~~/server/services/routing-runtime-service'
import { getSqlState } from '~~/server/utils/database-error'
import { normalizeRouteHost } from '~~/server/utils/route-pattern'
import { firstRow } from '~~/server/utils/row'

const DEFAULT_WORKSPACE_SLUG = 'default'
const DEFAULT_ENVIRONMENT_SLUG = 'development'

interface CreateWorkspaceInput {
  slug: string
  name: string
  environment?: {
    slug: string
    name: string
    defaultDomain?: string | null
  }
}

interface UpdateWorkspaceInput {
  slug?: string
  name?: string
  status?: 'active' | 'disabled'
}

interface CreateEnvironmentInput {
  workspaceId: string
  slug: string
  name: string
  defaultDomain?: string | null
}

interface UpdateEnvironmentInput {
  slug?: string
  name?: string
  defaultDomain?: string | null
  status?: 'active' | 'disabled'
}

async function findWorkspaceBySlug(slug: string) {
  return firstRow(await db.select().from(workspaces).where(eq(workspaces.slug, slug)).limit(1))
}

async function lockEnvironments(tx: DatabaseTransaction) {
  return tx.select().from(environments)
    .orderBy(asc(environments.id))
    .for('update')
}

function normalizedDomain(value: string | null | undefined): string | null {
  return value ? normalizeRouteHost(value) : null
}

function assertDomainAvailable(input: {
  environments: Array<typeof environments.$inferSelect>
  environmentId?: string
  defaultDomain: string | null
  status: 'active' | 'disabled'
}): void {
  if (input.status !== 'active') return
  const activeOthers = input.environments.filter(environment => (
    environment.id !== input.environmentId && environment.status === 'active'
  ))
  if (
    input.defaultDomain === null
    && activeOthers.some(environment => environment.defaultDomain === null)
  ) {
    throw createApplicationError({
      statusCode: 409,
      message: 'only one active environment may omit its default domain',
      data: { code: 'ENVIRONMENT_FALLBACK_CONFLICT' }
    })
  }
  if (
    input.defaultDomain !== null
    && activeOthers.some(environment => (
      environment.defaultDomain
      && normalizeRouteHost(environment.defaultDomain) === input.defaultDomain
    ))
  ) {
    throw createApplicationError({
      statusCode: 409,
      message: 'environment default domain is already owned by another active environment',
      data: {
        code: 'ENVIRONMENT_DOMAIN_CONFLICT',
        defaultDomain: input.defaultDomain
      }
    })
  }
}

async function invalidateRuntime(): Promise<void> {
  invalidateRoutingRuntimeCache()
  await invalidatePublicApiCatalogCache()
}

function conflictError(message: string) {
  return createApplicationError({
    statusCode: 409,
    message,
    data: { code: 'PLATFORM_RESOURCE_CONFLICT' }
  })
}

export const platformWorkspaceService = {
  async ensureDefault() {
    await db.insert(workspaces).values({
      slug: DEFAULT_WORKSPACE_SLUG,
      name: 'Default Workspace'
    }).onConflictDoNothing({ target: workspaces.slug })

    const workspace = await findWorkspaceBySlug(DEFAULT_WORKSPACE_SLUG)
    if (!workspace) throw new Error('default workspace bootstrap failed')

    await db.insert(environments).values({
      workspaceId: workspace.id,
      slug: DEFAULT_ENVIRONMENT_SLUG,
      name: 'Development'
    }).onConflictDoNothing({ target: [environments.workspaceId, environments.slug] })

    const environment = firstRow(await db.select().from(environments)
      .where(eq(environments.workspaceId, workspace.id)).limit(1))
    if (!environment) throw new Error('default environment bootstrap failed')
    return { workspace, environment }
  },

  async list() {
    const rows = await db.select({
      workspace: workspaces,
      environment: environments
    }).from(workspaces)
      .leftJoin(environments, eq(environments.workspaceId, workspaces.id))
      .orderBy(asc(workspaces.name), asc(environments.name))

    const result = new Map<string, typeof workspaces.$inferSelect & {
      environments: Array<typeof environments.$inferSelect>
    }>()
    for (const row of rows) {
      const item = result.get(row.workspace.id) ?? { ...row.workspace, environments: [] }
      if (row.environment) item.environments.push(row.environment)
      result.set(row.workspace.id, item)
    }
    return Array.from(result.values())
  },

  async create(input: CreateWorkspaceInput) {
    try {
      const created = await db.transaction(async (tx) => {
        const lockedEnvironments = await lockEnvironments(tx)
        const workspace = firstRow(await tx.insert(workspaces).values({
          slug: input.slug,
          name: input.name
        }).returning())
        if (!workspace) throw new Error('workspace insert returned no row')

        const environmentInput = input.environment ?? {
          slug: DEFAULT_ENVIRONMENT_SLUG,
          name: 'Development',
          defaultDomain: null
        }
        const defaultDomain = normalizedDomain(environmentInput.defaultDomain)
        assertDomainAvailable({
          environments: lockedEnvironments,
          defaultDomain,
          status: 'active'
        })
        const environment = firstRow(await tx.insert(environments).values({
          workspaceId: workspace.id,
          slug: environmentInput.slug,
          name: environmentInput.name,
          defaultDomain
        }).returning())
        if (!environment) throw new Error('environment insert returned no row')
        return { ...workspace, environments: [environment] }
      })
      await invalidateRuntime()
      return created
    } catch (error) {
      if (getSqlState(error) === '23505') throw conflictError('workspace or environment slug already exists')
      throw error
    }
  },

  async update(id: string, input: UpdateWorkspaceInput) {
    try {
      const updated = await db.transaction(async (tx) => {
        const current = firstRow(await tx.select().from(workspaces)
          .where(eq(workspaces.id, id)).limit(1).for('update'))
        if (!current) {
          throw createApplicationError({ statusCode: 404, message: 'workspace not found', data: { code: 'WORKSPACE_NOT_FOUND' } })
        }
        const row = firstRow(await tx.update(workspaces).set({
          ...input,
          updatedAt: new Date()
        }).where(eq(workspaces.id, id)).returning())
        if (!row) throw new Error('workspace update returned no row')

        if (input.status === 'disabled') {
          const environmentRows = await tx.select({ id: environments.id })
            .from(environments).where(eq(environments.workspaceId, id))
          const environmentIds = environmentRows.map(item => item.id)
          if (environmentIds.length > 0) {
            await tx.update(routingRevisions).set({ status: 'superseded' })
              .where(and(
                inArray(routingRevisions.environmentId, environmentIds),
                eq(routingRevisions.status, 'published')
              ))
            await tx.update(environments).set({
              status: 'disabled',
              activeRevisionId: null,
              updatedAt: new Date()
            }).where(inArray(environments.id, environmentIds))
          }
        }
        return row
      })
      await invalidateRuntime()
      return updated
    } catch (error) {
      if (getSqlState(error) === '23505') throw conflictError('workspace slug already exists')
      throw error
    }
  },

  async remove(id: string) {
    return db.transaction(async (tx) => {
      const workspace = firstRow(await tx.select().from(workspaces)
        .where(eq(workspaces.id, id)).limit(1).for('update'))
      if (!workspace) {
        throw createApplicationError({ statusCode: 404, message: 'workspace not found', data: { code: 'WORKSPACE_NOT_FOUND' } })
      }
      if (workspace.slug === DEFAULT_WORKSPACE_SLUG) {
        throw conflictError('the default workspace cannot be deleted')
      }

      const [products, upstreams, revisions, documents] = await Promise.all([
        tx.select({ value: count() }).from(apiProducts).where(eq(apiProducts.workspaceId, id)),
        tx.select({ value: count() }).from(upstreamServices).where(eq(upstreamServices.workspaceId, id)),
        tx.select({ value: count() }).from(routingRevisions).where(eq(routingRevisions.workspaceId, id)),
        tx.select({ value: count() }).from(openapiDocuments).where(eq(openapiDocuments.workspaceId, id))
      ])
      const dependencies = {
        products: Number(products[0]?.value ?? 0),
        upstreams: Number(upstreams[0]?.value ?? 0),
        revisions: Number(revisions[0]?.value ?? 0),
        documents: Number(documents[0]?.value ?? 0)
      }
      if (Object.values(dependencies).some(value => value > 0)) {
        throw createApplicationError({
          statusCode: 409,
          message: 'workspace still owns API resources or routing history',
          data: { code: 'WORKSPACE_NOT_EMPTY', dependencies }
        })
      }
      await tx.delete(workspaces).where(eq(workspaces.id, id))
      return workspace
    }).finally(invalidateRuntime)
  },

  async createEnvironment(input: CreateEnvironmentInput) {
    try {
      const created = await db.transaction(async (tx) => {
        const lockedEnvironments = await lockEnvironments(tx)
        const workspace = firstRow(await tx.select().from(workspaces)
          .where(and(eq(workspaces.id, input.workspaceId), eq(workspaces.status, 'active')))
          .limit(1))
        if (!workspace) {
          throw createApplicationError({ statusCode: 404, message: 'active workspace not found', data: { code: 'WORKSPACE_NOT_FOUND' } })
        }
        const defaultDomain = normalizedDomain(input.defaultDomain)
        assertDomainAvailable({
          environments: lockedEnvironments,
          defaultDomain,
          status: 'active'
        })
        const environment = firstRow(await tx.insert(environments).values({
          workspaceId: input.workspaceId,
          slug: input.slug,
          name: input.name,
          defaultDomain
        }).returning())
        if (!environment) throw new Error('environment insert returned no row')
        return environment
      })
      await invalidateRuntime()
      return created
    } catch (error) {
      if (getSqlState(error) === '23505') throw conflictError('environment slug already exists in this workspace')
      throw error
    }
  },

  async updateEnvironment(id: string, input: UpdateEnvironmentInput) {
    try {
      const updated = await db.transaction(async (tx) => {
        const lockedEnvironments = await lockEnvironments(tx)
        const current = lockedEnvironments.find(item => item.id === id)
        if (!current) {
          throw createApplicationError({ statusCode: 404, message: 'environment not found', data: { code: 'ENVIRONMENT_NOT_FOUND' } })
        }
        const workspace = firstRow(await tx.select().from(workspaces)
          .where(eq(workspaces.id, current.workspaceId)).limit(1))
        const status = input.status ?? current.status as 'active' | 'disabled'
        if (status === 'active' && workspace?.status !== 'active') {
          throw conflictError('an environment cannot be enabled while its workspace is disabled')
        }
        const defaultDomain = input.defaultDomain === undefined
          ? current.defaultDomain
          : normalizedDomain(input.defaultDomain)
        assertDomainAvailable({
          environments: lockedEnvironments,
          environmentId: current.id,
          defaultDomain,
          status
        })
        if (status === 'disabled') {
          await tx.update(routingRevisions).set({ status: 'superseded' })
            .where(and(
              eq(routingRevisions.environmentId, current.id),
              eq(routingRevisions.status, 'published')
            ))
        }
        const row = firstRow(await tx.update(environments).set({
          ...input,
          defaultDomain,
          activeRevisionId: status === 'disabled' ? null : current.activeRevisionId,
          updatedAt: new Date()
        }).where(eq(environments.id, id)).returning())
        if (!row) throw new Error('environment update returned no row')
        return row
      })
      await invalidateRuntime()
      return updated
    } catch (error) {
      if (getSqlState(error) === '23505') throw conflictError('environment slug already exists in this workspace')
      throw error
    }
  },

  async removeEnvironment(id: string) {
    const removed = await db.transaction(async (tx) => {
      const environment = firstRow(await tx.select().from(environments)
        .where(eq(environments.id, id)).limit(1).for('update'))
      if (!environment) {
        throw createApplicationError({ statusCode: 404, message: 'environment not found', data: { code: 'ENVIRONMENT_NOT_FOUND' } })
      }
      const revisionCount = firstRow(await tx.select({ value: count() })
        .from(routingRevisions).where(eq(routingRevisions.environmentId, id)))
      if (Number(revisionCount?.value ?? 0) > 0) {
        throw createApplicationError({
          statusCode: 409,
          message: 'environment routing history must be retained',
          data: { code: 'ENVIRONMENT_HAS_REVISIONS' }
        })
      }
      await tx.delete(environments).where(eq(environments.id, id))
      return environment
    })
    await invalidateRuntime()
    return removed
  }
}
