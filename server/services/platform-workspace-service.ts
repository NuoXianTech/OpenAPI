import { asc, eq } from 'drizzle-orm'
import { db } from '~~/server/db/client'
import { environments, workspaces } from '~~/server/db/schema'
import { createApplicationError } from '~~/server/errors/application-error'
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

async function findWorkspaceBySlug(slug: string) {
  return firstRow(await db.select().from(workspaces).where(eq(workspaces.slug, slug)).limit(1))
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

    const environment = firstRow(await db.select().from(environments).where(eq(environments.workspaceId, workspace.id)).limit(1))
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

    const result = new Map<string, typeof workspaces.$inferSelect & { environments: Array<typeof environments.$inferSelect> }>()
    for (const row of rows) {
      const item = result.get(row.workspace.id) ?? { ...row.workspace, environments: [] }
      if (row.environment) item.environments.push(row.environment)
      result.set(row.workspace.id, item)
    }
    return Array.from(result.values())
  },

  async create(input: CreateWorkspaceInput) {
    try {
      return await db.transaction(async (tx) => {
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
        const defaultDomain = environmentInput.defaultDomain
          ? normalizeRouteHost(environmentInput.defaultDomain)
          : null
        const activeEnvironments = await tx.select({
          id: environments.id,
          defaultDomain: environments.defaultDomain
        }).from(environments).where(eq(environments.status, 'active'))

        if (defaultDomain === null && activeEnvironments.some(environment => environment.defaultDomain === null)) {
          throw createApplicationError({
            statusCode: 409,
            message: 'only one active environment may omit its default domain',
            data: { code: 'ENVIRONMENT_FALLBACK_CONFLICT' }
          })
        }
        if (defaultDomain !== null && activeEnvironments.some(environment => (
          environment.defaultDomain && normalizeRouteHost(environment.defaultDomain) === defaultDomain
        ))) {
          throw createApplicationError({
            statusCode: 409,
            message: 'environment default domain is already owned by another active environment',
            data: { code: 'ENVIRONMENT_DOMAIN_CONFLICT', defaultDomain }
          })
        }

        const environment = firstRow(await tx.insert(environments).values({
          workspaceId: workspace.id,
          slug: environmentInput.slug,
          name: environmentInput.name,
          defaultDomain
        }).returning())
        if (!environment) throw new Error('environment insert returned no row')
        return { ...workspace, environments: [environment] }
      })
    } catch (error) {
      if (getSqlState(error) === '23505') {
        throw createApplicationError({
          statusCode: 409,
          message: 'workspace slug already exists',
          data: { code: 'WORKSPACE_SLUG_CONFLICT' }
        })
      }
      throw error
    }
  }
}
