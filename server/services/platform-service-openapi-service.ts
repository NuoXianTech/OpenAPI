import { createHash } from 'node:crypto'
import { and, eq, sql } from 'drizzle-orm'
import type {
  ServiceDescription,
  ServiceEndpointSummary
} from '#shared/types/service-control'
import { db, type DatabaseTransaction } from '~~/server/db/client'
import {
  openapiDocuments,
  upstreamServices
} from '~~/server/db/schema'
import { createApplicationError } from '~~/server/errors/application-error'
import { canonicalJson } from '~~/server/utils/canonical-json'
import { firstRow } from '~~/server/utils/row'

const OPENAPI_METHODS = [
  'get',
  'head',
  'post',
  'put',
  'patch',
  'delete',
  'options'
] as const

function extractServiceEndpoints(
  document: Record<string, unknown>
): ServiceEndpointSummary[] {
  const paths = document.paths
  if (!paths || typeof paths !== 'object' || Array.isArray(paths)) return []
  const endpoints: ServiceEndpointSummary[] = []
  for (const [path, pathItem] of Object.entries(
    paths as Record<string, unknown>
  )) {
    if (!pathItem || typeof pathItem !== 'object' || Array.isArray(pathItem)) {
      continue
    }
    const operations = pathItem as Record<string, unknown>
    for (const method of OPENAPI_METHODS) {
      const operation = operations[method]
      if (!operation || typeof operation !== 'object' || Array.isArray(operation)) {
        continue
      }
      const value = operation as Record<string, unknown>
      const tags = Array.isArray(value.tags)
        ? value.tags.filter((tag): tag is string => typeof tag === 'string')
        : []
      const platformExtension = value['x-openapi-platform']
      const support = Boolean(
        platformExtension
        && typeof platformExtension === 'object'
        && !Array.isArray(platformExtension)
        && (platformExtension as Record<string, unknown>).support === true
      )
      endpoints.push({
        method: method.toUpperCase(),
        path,
        operationId: typeof value.operationId === 'string'
          ? value.operationId
          : null,
        summary: typeof value.summary === 'string' ? value.summary : null,
        tags,
        system: tags.includes('System'),
        support
      })
    }
  }
  return endpoints.sort((left, right) => (
    Number(left.system) - Number(right.system)
    || Number(left.support) - Number(right.support)
    || left.path.localeCompare(right.path)
    || left.method.localeCompare(right.method)
  ))
}

export function readStoredServiceEndpoints(
  summary: Record<string, unknown>
): ServiceEndpointSummary[] {
  const endpoints = summary.endpoints
  if (!Array.isArray(endpoints)) return []
  return endpoints.flatMap((endpoint) => {
    if (!endpoint || typeof endpoint !== 'object' || Array.isArray(endpoint)) {
      return []
    }
    const value = endpoint as Partial<ServiceEndpointSummary>
    if (
      typeof value.method !== 'string'
      || typeof value.path !== 'string'
      || !Array.isArray(value.tags)
      || typeof value.system !== 'boolean'
    ) return []
    return [{
      method: value.method,
      path: value.path,
      operationId: typeof value.operationId === 'string'
        ? value.operationId
        : null,
      summary: typeof value.summary === 'string' ? value.summary : null,
      tags: value.tags.filter((tag): tag is string => typeof tag === 'string'),
      system: value.system,
      support: value.support === true
    }]
  })
}

export async function persistServiceOpenApi(input: {
  upstreamServiceId: string
  description: ServiceDescription
  document: Record<string, unknown>
  reportedSha256: string | null
  sourceUrl: string
  transaction?: DatabaseTransaction
}) {
  const executor = input.transaction ?? db
  const calculatedHash = createHash('sha256')
    .update(canonicalJson(input.document))
    .digest('hex')
  if (
    calculatedHash !== input.description.openapiSha256
    || input.reportedSha256 !== calculatedHash
  ) {
    throw createApplicationError({
      statusCode: 409,
      message: 'Service OpenAPI fingerprint does not match its document',
      data: { code: 'SERVICE_OPENAPI_HASH_MISMATCH' }
    })
  }

  const provenance = and(
    eq(openapiDocuments.upstreamServiceId, input.upstreamServiceId),
    eq(openapiDocuments.contentHash, calculatedHash)
  )
  let existing = firstRow(await executor.select().from(openapiDocuments)
    .where(provenance)
    .limit(1))
  const endpoints = extractServiceEndpoints(input.document)
  const parsedSummary = {
    endpointCount: endpoints.filter(endpoint => (
      !endpoint.system && !endpoint.support
    )).length,
    endpoints
  }
  let document = existing ?? firstRow(await executor.insert(openapiDocuments)
    .values({
      upstreamServiceId: input.upstreamServiceId,
      sourceType: 'url',
      sourceUrl: input.sourceUrl,
      format: 'json',
      specVersion: typeof input.document.openapi === 'string'
        ? input.document.openapi
        : '3.1.0',
      content: input.document,
      contentHash: calculatedHash,
      parsedSummary,
      fetchedAt: new Date()
    }).onConflictDoNothing({
      target: [
        openapiDocuments.upstreamServiceId,
        openapiDocuments.contentHash
      ],
      where: sql`${openapiDocuments.upstreamServiceId} IS NOT NULL`
    })
    .returning())
  if (!document) {
    existing = firstRow(await executor.select().from(openapiDocuments)
      .where(provenance)
      .limit(1))
    document = existing
  }
  if (!document) throw new Error('OpenAPI document insert returned no row')

  if (existing) {
    document = firstRow(await executor.update(openapiDocuments).set({
      sourceUrl: input.sourceUrl,
      parsedSummary,
      fetchedAt: new Date()
    }).where(eq(openapiDocuments.id, existing.id)).returning()) ?? existing
  }
  await executor.update(upstreamServices).set({
    openapiDocumentId: document.id,
    updatedAt: new Date()
  }).where(eq(upstreamServices.id, input.upstreamServiceId))
  return document
}
