import { and, eq } from 'drizzle-orm'
import { db } from '~~/server/db/client'
import { environments, routingRevisions } from '~~/server/db/schema'

async function activePayloads(workspaceId?: string) {
  return db.select({ payload: routingRevisions.configPayload })
    .from(environments)
    .innerJoin(routingRevisions, eq(routingRevisions.id, environments.activeRevisionId))
    .where(and(
      eq(environments.status, 'active'),
      eq(routingRevisions.status, 'published'),
      workspaceId ? eq(routingRevisions.workspaceId, workspaceId) : undefined
    ))
}

export const routingReferenceService = {
  async hasRoute(routeId: string): Promise<boolean> {
    return (await activePayloads()).some(row => (
      row.payload.routes.some(route => route.id === routeId)
    ))
  },

  async hasProduct(productId: string): Promise<boolean> {
    return (await activePayloads()).some(row => (
      row.payload.routes.some(route => route.productId === productId)
    ))
  },

  async hasVersion(versionId: string): Promise<boolean> {
    return (await activePayloads()).some(row => (
      row.payload.routes.some(route => route.versionId === versionId)
    ))
  },

  async hasUpstream(upstreamId: string): Promise<boolean> {
    return (await activePayloads()).some(row => (
      row.payload.upstreams.some(upstream => upstream.id === upstreamId)
    ))
  },

  async hasTarget(targetId: string): Promise<boolean> {
    return (await activePayloads()).some(row => (
      row.payload.upstreams.some(upstream => (
        upstream.targets.some(target => target.id === targetId)
      ))
    ))
  }
}
