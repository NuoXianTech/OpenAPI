import { and, eq } from 'drizzle-orm'
import { db, type DatabaseTransaction } from '~~/server/db/client'
import { environments, routingRevisions } from '~~/server/db/schema'

async function activePayloads(
  workspaceId?: string,
  transaction?: DatabaseTransaction
) {
  const executor = transaction ?? db
  return executor.select({ payload: routingRevisions.configPayload })
    .from(environments)
    .innerJoin(routingRevisions, eq(routingRevisions.id, environments.activeRevisionId))
    .where(and(
      eq(environments.status, 'active'),
      workspaceId ? eq(routingRevisions.workspaceId, workspaceId) : undefined
    ))
}

export const routingReferenceService = {
  async hasRoute(routeId: string, transaction?: DatabaseTransaction): Promise<boolean> {
    return (await activePayloads(undefined, transaction)).some(row => (
      row.payload.routes.some(route => route.id === routeId)
    ))
  },

  async hasProduct(productId: string, transaction?: DatabaseTransaction): Promise<boolean> {
    return (await activePayloads(undefined, transaction)).some(row => (
      row.payload.routes.some(route => route.productId === productId)
    ))
  },

  async hasVersion(versionId: string, transaction?: DatabaseTransaction): Promise<boolean> {
    return (await activePayloads(undefined, transaction)).some(row => (
      row.payload.routes.some(route => route.versionId === versionId)
    ))
  },

  async hasUpstream(upstreamId: string, transaction?: DatabaseTransaction): Promise<boolean> {
    return (await activePayloads(undefined, transaction)).some(row => (
      row.payload.upstreams.some(upstream => upstream.id === upstreamId)
    ))
  },

  async hasTarget(targetId: string, transaction?: DatabaseTransaction): Promise<boolean> {
    return (await activePayloads(undefined, transaction)).some(row => (
      row.payload.upstreams.some(upstream => (
        upstream.targets.some(target => target.id === targetId)
      ))
    ))
  }
}
