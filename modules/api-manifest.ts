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
import type { ManifestApi, ManifestEndpoint } from '../server/types/api-guard'

const SOURCE_FILE_RE = /^(.+?)(?:\.(get|post|put|delete|patch|head|options|connect|trace))?\.(ts|mts|js|mjs)$/i
const DYNAMIC_PARAM_RE = /^\[(.+?)\]$/
const CATCH_ALL_RE = /^\[\.\.\.(.+?)\]$/
const VERSION_DIR_RE = /^v\d+$/

interface ParsedFile {
  baseName: string
  method: string
}

function parseEndpointFile(filename: string): ParsedFile | null {
  // .d.ts 声明文件不是 endpoint：SOURCE_FILE_RE 会把它误解析成 baseName='xxx.d'
  if (filename.endsWith('.d.ts')) return null
  const m = SOURCE_FILE_RE.exec(filename)
  if (!m) return null
  return {
    baseName: m[1]!,
    method: m[2] ? m[2].toUpperCase() : 'ANY'
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

/** 把一个目录/文件段拼接到 basePath 之后，统一动态段（:name / :name*）与静态段的写法 */
function appendSegment(basePath: string, seg: SegmentInfo): string {
  if (!seg.paramName) return `${basePath}/${seg.literal}`
  return `${basePath}/:${seg.paramName}${seg.isCatchAll ? '*' : ''}`
}

/** 唯一的 ManifestEndpoint 工厂：sourceFile 归一化与 patternRegex 编译都只此一处 */
function makeEndpoint(
  rootDir: string,
  fullPath: string,
  apiPath: string,
  method: string,
  paramNames: string[],
  isCatchAll: boolean
): ManifestEndpoint {
  return {
    apiPath,
    method,
    sourceFile: relative(rootDir, fullPath).split(sep).join('/'),
    paramNames,
    isCatchAll,
    patternRegex: compilePatternRegex(apiPath)
  }
}

/** 按 code 把 endpoints 聚合进 byCode（已存在则追加，否则新建 ManifestApi） */
function upsertApi(
  byCode: Map<string, ManifestApi>,
  pathVersion: string,
  code: string,
  endpoints: ManifestEndpoint[]
): void {
  const existing = byCode.get(code)
  if (existing) existing.endpoints.push(...endpoints)
  else byCode.set(code, { pathVersion, code, endpoints: [...endpoints] })
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
      const nested = await scanDirRecursive(full, {
        rootDir: ctx.rootDir,
        basePath: appendSegment(ctx.basePath, seg),
        paramNames: seg.paramName ? [...ctx.paramNames, seg.paramName] : ctx.paramNames,
        hasCatchAllUpstream: ctx.hasCatchAllUpstream || seg.isCatchAll
      })
      out.push(...nested)
      continue
    }

    if (!entry.isFile()) continue
    const parsed = parseEndpointFile(entry.name)
    if (!parsed) continue

    // index.* → 路径即所在目录；其余文件名作为一个路径段拼接（可能是动态段）
    if (parsed.baseName === 'index') {
      out.push(makeEndpoint(ctx.rootDir, full, ctx.basePath, parsed.method, ctx.paramNames, ctx.hasCatchAllUpstream))
      continue
    }

    const seg = parseSegment(parsed.baseName)
    out.push(makeEndpoint(
      ctx.rootDir,
      full,
      appendSegment(ctx.basePath, seg),
      parsed.method,
      seg.paramName ? [...ctx.paramNames, seg.paramName] : ctx.paramNames,
      ctx.hasCatchAllUpstream || seg.isCatchAll
    ))
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
            + `v{N} 下第一层必须是静态目录或文件（该名字 = apis.code）。`
          )
        }
        const code = child.name
        const endpoints = await scanDirRecursive(join(versionRoot, code), {
          rootDir,
          basePath: `/${pathVersion}/${code}`,
          paramNames: [],
          hasCatchAllUpstream: false
        })
        upsertApi(byCode, pathVersion, code, endpoints)
        continue
      }

      if (!child.isFile()) continue
      const parsed = parseEndpointFile(child.name)
      if (!parsed) continue
      if (parsed.baseName === 'index') {
        throw new Error(
          `[api-manifest] 违反约定：server/routes/${pathVersion}/${child.name} 不合法；`
          + `请改用子目录或 <code>.<method>.ts 命名。`
        )
      }
      const fileSeg = parseSegment(parsed.baseName)
      if (fileSeg.paramName) {
        throw new Error(
          `[api-manifest] 违反约定：server/routes/${pathVersion}/${child.name} 第一层是动态段。`
        )
      }
      const code = fileSeg.literal
      const fullPath = join(versionRoot, child.name)
      const endpoint = makeEndpoint(rootDir, fullPath, `/${pathVersion}/${code}`, parsed.method, [], false)
      upsertApi(byCode, pathVersion, code, [endpoint])
    }

    for (const api of byCode.values()) {
      // 路由冲突检测：同一 (method, 匹配正则) 只能由一个源文件产生。
      // 用 patternRegex 作冲突身份（而非 apiPath）能一并抓出两类隐患：
      //   1. 同一路由两种写法并存：crypto/index.get.ts 与 crypto.get.ts 都 → GET /v1/crypto
      //   2. 同形动态段换了参数名：[name].get.ts 与 [id].get.ts，apiPath 不同但正则全等
      // 二者在 Nitro 路由表里都是歧义路由，静默去重只会把它变成"接口没生效 / 参数名取不到"
      // 这类难查的运行时问题。与其它约定违例一致，构建期 fail fast。
      const seen = new Map<string, ManifestEndpoint>()
      for (const ep of api.endpoints) {
        const key = `${ep.method}|${ep.patternRegex}`
        const prev = seen.get(key)
        if (prev) {
          const where = prev.apiPath === ep.apiPath ? ep.apiPath : `${prev.apiPath} 与 ${ep.apiPath}`
          throw new Error(
            `[api-manifest] 路由冲突：${prev.sourceFile} 与 ${ep.sourceFile} 都解析为 `
            + `${ep.method} ${where}（匹配规则相同）。请删除其一，或改用不同的方法 / 路径。`
          )
        }
        seen.set(key, ep)
      }
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
    ''
  ].join('\n')
}

export default defineNuxtModule({
  meta: {
    name: 'api-manifest',
    configKey: 'apiManifest'
  },
  setup(_options, nuxt) {
    const rootDir = nuxt.options.rootDir

    nuxt.hook('nitro:config', async (nitroConfig) => {
      nitroConfig.virtual = nitroConfig.virtual || {}

      // 在 Nitro 配置阶段扫描一次：构建期 fail fast，生产环境固化为静态字符串。
      let initialManifest: ManifestApi[]
      try {
        initialManifest = await buildManifest(rootDir)
      } catch (err) {
        console.error((err as Error).message)
        throw err
      }

      // dev：每次 import 重新扫盘以反映新增/删除的 endpoint 文件
      // prod：build 阶段已 frozen，固化为静态字符串避免运行时 IO
      if (nuxt.options.dev) {
        nitroConfig.virtual['#api-manifest'] = async () => {
          try {
            const manifest = await buildManifest(rootDir)
            return renderManifestModule(manifest)
          } catch (err) {
            console.error('[api-manifest] 扫描失败：', (err as Error).message)
            return renderManifestModule([])
          }
        }
      } else {
        nitroConfig.virtual['#api-manifest'] = renderManifestModule(initialManifest)
      }
    })

    // 声明 #api-manifest 的类型，使 Nuxt / Nitro 类型检查都能解析到。
    addTypeTemplate({
      filename: 'types/api-manifest.d.ts',
      getContents: () => [
        `declare module '#api-manifest' {`,
        `  import type { ManifestApi } from '${relative(join(rootDir, '.nuxt', 'types'), join(rootDir, 'server', 'types', 'api-guard')).split(sep).join('/')}'`,
        `  export const API_MANIFEST: ManifestApi[]`,
        `}`,
        ''
      ].join('\n')
    }, { nitro: true, nuxt: true })
  }
})
