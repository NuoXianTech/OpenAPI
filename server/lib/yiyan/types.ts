/**
 * yiyan（一言）类型定义与常量表。
 *
 * - YiyanSentence：与 server/lib/yiyan/data/*.json 内每个元素一一对应的原始结构
 * - YiyanRecord：对外输出结构，id 改为「类型+原始id」复合串（如 a1），其余字段透传
 * - 用对象映射（YIYAN_TYPE_LABELS）而非 enum 表达类型全集，保持类型安全与可扩展
 */

export interface YiyanSentence {
  id: number
  yiyan: string
  type: string
  from: string | null
  from_who: string | null
  created_at: string
  length: number
}

export interface YiyanRecord {
  id: string
  yiyan: string
  type: string
  from: string | null
  from_who: string | null
  created_at: string
  length: number
}

/** 句子类型 → 中文标签。键集合即合法 type 全集（见接口 spec 第三节）。 */
export const YIYAN_TYPE_LABELS = {
  a: '动画',
  b: '漫画',
  c: '游戏',
  d: '文学',
  e: '原创',
  f: '影视',
  g: '诗词',
  h: '哲学',
  i: 'v50文案',
  n: '其他',
  z: '来自网络'
} as const

export type YiyanType = keyof typeof YIYAN_TYPE_LABELS

/** 缺省 / 非法 type 一律按动画处理（见接口 spec）。 */
export const DEFAULT_YIYAN_TYPE: YiyanType = 'a'

export function isYiyanType(value: string): value is YiyanType {
  return Object.prototype.hasOwnProperty.call(YIYAN_TYPE_LABELS, value)
}

/** 返回编码。其他值回退 json（见接口 spec）。 */
export const YIYAN_ENCODES = ['text', 'json', 'js', 'md'] as const
export type YiyanEncode = typeof YIYAN_ENCODES[number]
export const DEFAULT_YIYAN_ENCODE: YiyanEncode = 'json'

export function isYiyanEncode(value: string): value is YiyanEncode {
  return (YIYAN_ENCODES as readonly string[]).includes(value)
}

/** 字符集。其他值回退 utf-8（见接口 spec）。 */
export type YiyanCharset = 'utf-8' | 'gbk'
export const DEFAULT_YIYAN_CHARSET: YiyanCharset = 'utf-8'

/** encode=js 默认选择器；长度窗口默认值。 */
export const DEFAULT_YIYAN_SELECT = '.yiyan'
export const DEFAULT_MIN_LENGTH = 0
export const DEFAULT_MAX_LENGTH = 30
