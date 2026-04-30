/**
 * API Manifest · 构建期 Nuxt Module
 *
 * 职责：
 * 1. 扫描 `server/routes/v{N}/**`，按 Nitro 文件约定解析出所有 endpoints
 * 2. 按 `(pathVersion, code)` 聚合为 ManifestApi[]，其中 code = v{N} 下第一层目录/文件名
 * 3. 通过 Nitro virtual module `#api-manifest` 注入运行时
 * 4. 违反约定（v{N} 下第一层是动态段、v{N}/index.* 等）构建期抛错
 *
 * 路径约定：endpoints 直接挂在 /v{N}/<code>/...，**不含 /api/ 前缀**。
 * 用 `server/routes/` 而非 `server/api/`，是为了规避 Nitro 对后者强制添加 /api 前缀的约束。
 *
 * dev 热更新说明：virtual module 以函数形式提供，理论上每次 import 重算。
 * 实践中新增/删除 endpoint 文件建议重启 `pnpm run dev` 以确保 Nitro 路由与 manifest 一致。
 */

import { readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { addTypeTemplate, defineNuxtModule } from 'nuxt/kit'
import type { ManifestApi, ManifestEndpoint } from '../shared/types/api-guard'

const SOURCE_FILE_RE = /^(.+?)(?:\.(get|post|put|delete|patch|head|options|connect|trace))?\.(ts|mts|js|mjs)$/i
const DYNAMIC_PARAM_RE = /^\[(.+?)\]$/
const CATCH_ALL_RE = /^\[\.\.\.(.+?)\]$/
const VERSION_DIR_RE = /^v\d+$/

interface ParsedFile {
  baseName: string
  method: string
}

function parseEndpointFile(filename: string): ParsedFile | null {
  const m = SOURCE_FILE_RE.exec(filename)
  if (!m) return null
  return {
    baseName: m[1]!,
    method: m[2] ? m[2].toUpperCase() : 'ANY',
  }
}

interface SegmentInfo {
  literal: string
  paramName?: string
  isCatchAll: boolean
}

function parseSegment(segment: string): SegmentInfo {
  const catchAll = CATCH_ALL_RE.exec(segment)
  if (catchAll) return { literal: '', paramName: catchAll[1]!, isCatchAll: true }
  const param = DYNAMIC_PARAM_RE.exec(segment)
  if (param) return { literal: '', paramName: param[1]!, isCatchAll: false }
  return { literal: segment, isCatchAll: false }
}

function escapeLiteral(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function compilePatternRegex(pattern: string): string {
  const segments = pattern.split('/').filter(s => s.length > 0)
  const parts: string[] = []
  for (const seg of segments) {
    if (seg.endsWith('*') && seg.startsWith(':')) {
      parts.push('(.+)')
      continue
    }
    if (seg.startsWith(':')) {
      parts.push('([^/]+)')
      continue
    }
    parts.push(escapeLiteral(seg))
  }
  return `^/${parts.join('/')}/?$`
}

interface ScanContext {
  rootDir: string
  basePath: string
  paramNames: string[]
  hasCatchAllUpstream: boolean
}

async function scanDirRecursive(dir: string, ctx: ScanContext): Promise<ManifestEndpoint[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const out: ManifestEndpoint[] = []

  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      const seg = parseSegment(entry.name)
      const nextPath = seg.paramName
        ? `${ctx.basePath}/${seg.isCatchAll ? `:${seg.paramName}*` : `:${seg.paramName}`}`
        : `${ctx.basePath}/${seg.literal}`
      const nextParams = seg.paramName ? [...ctx.paramNames, seg.paramName] : ctx.paramNames
      const nested = await scanDirRecursive(full, {
        rootDir: ctx.rootDir,
        basePath: nextPath,
        paramNames: nextParams,
        hasCatchAllUpstream: ctx.hasCatchAllUpstream || seg.isCatchAll,
      })
      out.push(...nested)
      continue
    }

    if (!entry.isFile()) continue
    const parsed = parseEndpointFile(entry.name)
    if (!parsed) continue

    const fileSeg = parseSegment(parsed.baseName)
    let apiPath = ctx.basePath
    let paramNames = ctx.paramNames
    let isCatchAll = ctx.hasCatchAllUpstream

    if (parsed.baseName === 'index') {
      // index.get.ts → basePath 不变
    }
    else if (fileSeg.paramName) {
      apiPath = `${ctx.basePath}/${fileSeg.isCatchAll ? `:${fileSeg.paramName}*` : `:${fileSeg.paramName}`}`
      paramNames = [...ctx.paramNames, fileSeg.paramName]
      isCatchAll = isCatchAll || fileSeg.isCatchAll
    }
    else {
      apiPath = `${ctx.basePath}/${fileSeg.literal}`
    }

    out.push({
      apiPath,
      method: parsed.method,
      sourceFile: relative(ctx.rootDir, full).split(sep).join('/'),
      paramNames,
      isCatchAll,
      patternRegex: compilePatternRegex(apiPath),
    })
  }

  return out
}

export async function buildManifest(rootDir: string): Promise<ManifestApi[]> {
  const apiDir = join(rootDir, 'server', 'routes')
  if (!existsSync(apiDir)) return []

  const topLevel = await readdir(apiDir, { withFileTypes: true })
  const versionDirs = topLevel.filter(e => e.isDirectory() && VERSION_DIR_RE.test(e.name))

  const result: ManifestApi[] = []

  for (const versionDir of versionDirs) {
    const pathVersion = versionDir.name
    const versionRoot = join(apiDir, pathVersion)
    const children = await readdir(versionRoot, { withFileTypes: true })
    const byCode = new Map<string, ManifestApi>()

    for (const child of children) {
      if (child.isDirectory()) {
        if (DYNAMIC_PARAM_RE.test(child.name) || CATCH_ALL_RE.test(child.name)) {
          throw new Error(
            `[api-manifest] 违反约定：server/routes/${pathVersion}/${child.name} 不允许动态段；`
            + `v{N} 下第一层必须是静态目录或文件（该名字 = apis.code）。`,
          )
        }
        const code = child.name
        const sourceDir = relative(rootDir, join(versionRoot, code)).split(sep).join('/')
        const endpoints = await scanDirRecursive(join(versionRoot, code), {
          rootDir,
          basePath: `/${pathVersion}/${code}`,
          paramNames: [],
          hasCatchAllUpstream: false,
        })
        const existing = byCode.get(code)
        if (existing) existing.endpoints.push(...endpoints)
        else byCode.set(code, { pathVersion, code, sourceDir, endpoints })
      }
      else if (child.isFile()) {
        const parsed = parseEndpointFile(child.name)
        if (!parsed) continue
        if (parsed.baseName === 'index') {
          throw new Error(
            `[api-manifest] 违反约定：server/routes/${pathVersion}/${child.name} 不合法；`
            + `请改用子目录或 <code>.<method>.ts 命名。`,
          )
        }
        const fileSeg = parseSegment(parsed.baseName)
        if (fileSeg.paramName) {
          throw new Error(
            `[api-manifest] 违反约定：server/routes/${pathVersion}/${child.name} 第一层是动态段。`,
          )
        }
        const code = fileSeg.literal
        const apiPath = `/${pathVersion}/${code}`
        const endpoint: ManifestEndpoint = {
          apiPath,
          method: parsed.method,
          sourceFile: relative(rootDir, join(versionRoot, child.name)).split(sep).join('/'),
          paramNames: [],
          isCatchAll: false,
          patternRegex: compilePatternRegex(apiPath),
        }
        const existing = byCode.get(code)
        if (existing) existing.endpoints.push(endpoint)
        else {
          byCode.set(code, {
            pathVersion,
            code,
            sourceDir: relative(rootDir, versionRoot).split(sep).join('/'),
            endpoints: [endpoint],
          })
        }
      }
    }

    for (const api of byCode.values()) {
      const seen = new Set<string>()
      api.endpoints = api.endpoints.filter((ep) => {
        const key = `${ep.method}|${ep.apiPath}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      api.endpoints.sort((a, b) => {
        if (a.apiPath !== b.apiPath) return a.apiPath.localeCompare(b.apiPath)
        return a.method.localeCompare(b.method)
      })
      result.push(api)
    }
  }

  result.sort((a, b) => {
    if (a.pathVersion !== b.pathVersion) return a.pathVersion.localeCompare(b.pathVersion)
    return a.code.localeCompare(b.code)
  })
  return result
}

function renderManifestModule(apis: ManifestApi[]): string {
  return [
    '// AUTO-GENERATED by modules/api-manifest.ts — DO NOT EDIT',
    `export const API_MANIFEST = ${JSON.stringify(apis, null, 2)}`,
    `export const API_MANIFEST_GENERATED_AT = ${Date.now()}`,
    '',
  ].join('\n')
}

export default defineNuxtModule({
  meta: {
    name: 'api-manifest',
    configKey: 'apiManifest',
  },
  async setup(_options, nuxt) {
    const rootDir = nuxt.options.rootDir

    // 提前跑一次，构建期就让违规报错显现（build 阶段 fail fast）
    try {
      await buildManifest(rootDir)
    }
    catch (err) {
      console.error((err as Error).message)
      throw err
    }

    nuxt.hook('nitro:config', (nitroConfig) => {
      nitroConfig.virtual = nitroConfig.virtual || {}
      nitroConfig.virtual['#api-manifest'] = async () => {
        try {
          const manifest = await buildManifest(rootDir)
          return renderManifestModule(manifest)
        }
        catch (err) {
          console.error('[api-manifest] 扫描失败：', (err as Error).message)
          return renderManifestModule([])
        }
      }
    })

    // 声明 #api-manifest 的类型，使 server 代码 import 时有提示
    addTypeTemplate({
      filename: 'types/api-manifest.d.ts',
      getContents: () => [
        `declare module '#api-manifest' {`,
        `  import type { ManifestApi } from '${relative(join(rootDir, '.nuxt', 'types'), join(rootDir, 'shared', 'types', 'api-guard')).split(sep).join('/')}'`,
        `  export const API_MANIFEST: ManifestApi[]`,
        `  export const API_MANIFEST_GENERATED_AT: number`,
        `}`,
        '',
      ].join('\n'),
    })
  },
})
