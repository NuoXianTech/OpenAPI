import { and, eq } from 'drizzle-orm'
import type { ApiCapabilityConfigSnapshot, ApiCapabilityDefinition } from '#shared/types/api-capability'
import { apis } from '~~/server/db/schema'
import { db } from '~~/server/db/client'
import { getApiCapabilityDefinition } from '~~/server/lib/api-capabilities/definition-registry'
import { deleteSharedCache, getSharedCache } from '~~/server/utils/shared-cache'
import { firstRow } from '~~/server/utils/row'
import {
  createDefaultApiCapabilityValues,
  normalizeApiCapabilityValues,
  validateApiCapabilityDefinition
} from './values'

const CACHE_TTL_SECONDS = 15

export interface ApiCapabilityConfigError extends Error {
  statusCode: number
  errorCode: string
}

export function isApiCapabilityConfigError(error: unknown): error is ApiCapabilityConfigError {
  return error instanceof Error
    && typeof (error as Partial<ApiCapabilityConfigError>).statusCode === 'number'
    && typeof (error as Partial<ApiCapabilityConfigError>).errorCode === 'string'
}

function createConfigError(statusCode: number, errorCode: string, message: string): ApiCapabilityConfigError {
  return Object.assign(new Error(message), { statusCode, errorCode })
}

function createCacheKey(pathVersion: string, code: string): string {
  return `cache:api-capability:${pathVersion}:${code}`
}

function requireDefinition(pathVersion: string, code: string): ApiCapabilityDefinition {
  const definition = getApiCapabilityDefinition(pathVersion, code)
  if (!definition) {
    throw createConfigError(404, 'API_CAPABILITY_NOT_FOUND', `接口 ${pathVersion}/${code} 未声明业务能力`)
  }
  validateApiCapabilityDefinition(definition)
  return definition
}

export async function loadApiCapabilityConfig(
  pathVersion: string,
  code: string
): Promise<ApiCapabilityConfigSnapshot> {
  const definition = requireDefinition(pathVersion, code)

  return getSharedCache<ApiCapabilityConfigSnapshot>({
    key: createCacheKey(pathVersion, code),
    ttlSeconds: CACHE_TTL_SECONDS,
    async loader() {
      const rows = await db.select({
        values: apis.capabilityConfig,
        revision: apis.capabilityRevision,
        updatedAt: apis.capabilityUpdatedAt
      }).from(apis)
        .where(and(eq(apis.pathVersion, pathVersion), eq(apis.code, code)))
        .limit(1)
      const row = firstRow(rows)

      if (!row || row.revision === 0) {
        return {
          revision: 0,
          values: createDefaultApiCapabilityValues(definition),
          isConfigured: false,
          updatedAt: null
        }
      }

      return {
        revision: row.revision,
        values: normalizeApiCapabilityValues(definition, row.values ?? {}, true),
        isConfigured: true,
        updatedAt: row.updatedAt?.toISOString() ?? null
      }
    }
  })
}

export async function saveApiCapabilityConfig(
  pathVersion: string,
  code: string,
  revision: number,
  values: Record<string, unknown>,
  updatedBy: number | null
): Promise<ApiCapabilityConfigSnapshot> {
  const definition = requireDefinition(pathVersion, code)
  const normalizedValues = normalizeApiCapabilityValues(definition, values)
  const updatedAt = new Date()

  const rows = await db.update(apis).set({
    capabilityConfig: normalizedValues,
    capabilityRevision: revision + 1,
    capabilityUpdatedAt: updatedAt,
    updatedBy,
    updatedAt
  }).where(and(
    eq(apis.pathVersion, pathVersion),
    eq(apis.code, code),
    eq(apis.capabilityRevision, revision),
    eq(apis.isOrphaned, false)
  )).returning({ revision: apis.capabilityRevision })

  if (!firstRow(rows)) {
    const existing = await db.select({ revision: apis.capabilityRevision, isOrphaned: apis.isOrphaned })
      .from(apis)
      .where(and(eq(apis.pathVersion, pathVersion), eq(apis.code, code)))
      .limit(1)
    const current = firstRow(existing)
    if (!current) throw createConfigError(404, 'API_NOT_REGISTERED', '请先登记接口，再配置业务能力')
    if (current.isOrphaned) throw createConfigError(409, 'API_ORPHANED', '接口源文件已删除，无法修改业务能力')
    throw createConfigError(409, 'API_CAPABILITY_CONFIG_CONFLICT', '配置已被其他管理员修改，请刷新后重试')
  }

  await deleteSharedCache([createCacheKey(pathVersion, code)])
  return {
    revision: revision + 1,
    values: normalizedValues,
    isConfigured: true,
    updatedAt: updatedAt.toISOString()
  }
}
