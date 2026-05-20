/**
 * 加/解密算法集合的注册入口。
 *
 * 放在 server/lib/ 而非 server/utils/，是为了避开 Nitro 对 server/utils/** 的递归
 * auto-scan：注册中心模式要求 registry.ts 全项目单例。
 *
 * 每个 algorithms/<name>.ts 顶层调用 register()。但纯 side-effect import
 * (`import './algorithms/xxx'`) 在 Rollup 下若子模块被判为"无明显副作用"会被
 * tree-shake 掉。为避免这种隐式删除，下面**显式 import 各算法模块导出的纯函数**
 * 并放进一个被消费的 anchor 数组里，强制 rollup 保留整条 import 链。
 */

import { listAlgorithms } from './registry'
import { base64Encode } from './algorithms/base64'
import { coreValuesEncode } from './algorithms/core-values'
import { beastEncode } from './algorithms/beast'
import { taijiEncode } from './algorithms/taiji'
import { caesarEncrypt } from './algorithms/caesar'
import { morseEncode } from './algorithms/morse'
import { rc4Encrypt } from './algorithms/rc4'
import { emojiAesEncrypt } from './algorithms/emoji-aes'
import { buddhaEncrypt } from './algorithms/buddha'

/**
 * 把每个算法模块的一个 export 拉进 anchor，确保 rollup tree-shake 不会把
 * `import { register } from '../registry'` 的副作用调用一并删除。
 * 永远不被外部读取，仅用于锚定依赖图。
 */
const CRYPTO_MODULE_ANCHORS = [
  base64Encode, coreValuesEncode, beastEncode, taijiEncode, caesarEncrypt,
  morseEncode, rc4Encrypt, emojiAesEncrypt, buddhaEncrypt
]

/**
 * 确保所有算法均已注册；返回当前已注册数量。
 * 在 route handler 中调用一次即可触发懒加载链。
 */
export function ensureCryptoRegistered(): number {
  if (CRYPTO_MODULE_ANCHORS.length === 0) throw new Error('unreachable')
  return listAlgorithms().length
}
