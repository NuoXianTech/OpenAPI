/**
 * yiyan 句子仓库：按类型懒加载 JSON 数据 + 随机 / 按 id 选句。
 *
 * - LOADERS：每个类型一个「字面量 specifier」的 dynamic import。Rollup 能静态追踪，
 *   于是各类型各自 code-split、按需加载、构建期一并入包（区别于 import(变量) 那种
 *   nft / Rollup 追不到、prod 解析失败的写法）。
 * - cache：首次加载后常驻内存（数据只读、进程级单例），后续命中零 IO。
 * - pickSentence：给定 id 则在该类型内精确查；否则按长度窗口过滤后随机，
 *   过滤为空时回退该类型全量，保证「一言」总能给出一句。
 */

import type { YiyanSentence, YiyanType } from './types'

interface SentenceModule {
  default: unknown
}

const LOADERS: Record<YiyanType, () => Promise<SentenceModule>> = {
  a: () => import('./data/a.json'),
  b: () => import('./data/b.json'),
  c: () => import('./data/c.json'),
  d: () => import('./data/d.json'),
  e: () => import('./data/e.json'),
  f: () => import('./data/f.json'),
  g: () => import('./data/g.json'),
  h: () => import('./data/h.json'),
  i: () => import('./data/i.json'),
  n: () => import('./data/n.json'),
  z: () => import('./data/z.json')
}

const cache = new Map<YiyanType, YiyanSentence[]>()

export async function loadSentences(type: YiyanType): Promise<YiyanSentence[]> {
  const cached = cache.get(type)
  if (cached) return cached
  const mod = await LOADERS[type]()
  const list = Array.isArray(mod.default) ? (mod.default as YiyanSentence[]) : []
  cache.set(type, list)
  return list
}

export interface PickOptions {
  type: YiyanType
  minLength: number
  maxLength: number
  id?: string | null
}

/**
 * 把对外复合 id（如 a1）解析为该类型内的数字 id；纯数字也接受。
 * 解析失败返回 null（交由上层 404）。
 */
function parseNumericId(rawId: string): number | null {
  let s = rawId.trim()
  if (s.length > 1 && /^[a-z]/i.test(s)) s = s.slice(1)
  const n = Number(s)
  return Number.isInteger(n) && n > 0 ? n : null
}

export async function pickSentence(opts: PickOptions): Promise<YiyanSentence | null> {
  const list = await loadSentences(opts.type)

  if (opts.id) {
    const numericId = parseNumericId(opts.id)
    if (numericId === null) return null
    return list.find(s => s.id === numericId) ?? null
  }

  const inRange = list.filter(s => s.length >= opts.minLength && s.length <= opts.maxLength)
  const pool = inRange.length > 0 ? inRange : list
  if (pool.length === 0) return null
  return pool[Math.floor(Math.random() * pool.length)] ?? null
}
