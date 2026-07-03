# 公共接口接入指南（/v{N}/*）

> **这是一份 how-to**：手把手讲清楚「从零接入一个新的对外公共接口」要做哪些事、按什么顺序做、每一步的坑在哪。
>
> 它**不重复**契约条款，只负责把流程串起来并补齐**业务实现层**（`server/lib/`）这一块现有文档未覆盖的内容。两份配套规范请配合阅读：
>
> | 文档 | 关注层面 | 何时查 |
> | --- | --- | --- |
> | [RESTful API 设计风格](./style.md) | **风格层**：URL、HTTP 方法、响应壳、状态码、版本 | 设计接口形状时 |
> | [对外接口落地规范](./conventions.md) | **落地规范**：目录约定、构建期约束、响应工具、计费标记、后台注册字段 | 写 route handler 时 |
> | **本文** | **接入流程**：选形态 → 实现业务层 → 接路由 → 配计费 → 注册启用 → 验证 | 接一个新接口时 |

「公共接口」特指 `server/routes/v{N}/<code>/**` 下、被 [modules/api-manifest.ts](../../modules/api-manifest.ts) 扫描、被 [server/middleware/00.api-gate.ts](../../server/middleware/00.api-gate.ts) 治理（鉴权 / 限流 / 配额 / 计费）的那一类对外 HTTP 接口。后台内部 API（`server/api/admin/**`、`server/api/user/**`）**不属于**本文范围。

---

## 1. 第一步先决策：选哪种接入形态

项目里现存两类公共接口，对应两种**业务实现层组织模式**。接入前先判断你要做的属于哪一种——这决定了后续 80% 的工作量与文件落点。

| | 形态 A · 扩展现有接口 | 形态 B · 新建一类接口 |
| --- | --- | --- |
| **典型动作** | 给 `/v1/crypto` 加一个新算法、给某个分发型接口加一个新子项 | 从零开一个 `/v1/<新code>`（如 `/v1/yiyan`） |
| **要不要碰路由** | **不用**。已有的 `[name].post.ts` 按名字自动分发 | **要**。新建 `server/routes/v{N}/<code>/` 下的 handler |
| **要不要后台注册新 `(version, code)`** | 不用，复用现有接口的注册行 | **要**，注册并启用新行 |
| **业务层模式** | **注册中心**（registry）——见 [§3.2](#32-模式-a注册中心registry) | **数据源 / 仓库**（repository）或任意自定义——见 [§3.3](#33-模式-b数据源--仓库repository) |
| **现存样板** | [server/lib/crypto/](../../server/lib/crypto/) | [server/lib/yiyan/](../../server/lib/yiyan/) |

> **判断口诀**：「在已有能力里多挂一项」→ 形态 A；「开一个全新能力域」→ 形态 B。
> 如果你的新能力**预期会持续长出同类子项**（多种算法、多种数据源），即便现在只有一个，也值得按形态 A 的注册中心模式起步。

---

## 2. 接入全流程总览

两种形态共用同一条主流程，差异只在第 3、4 步的工作量：

```
① 设计接口形状        遵循 RESTful API 设计风格（URL / method / 响应壳 / 状态码 / 版本）
② 选形态              §1 决策表
③ 写业务实现层         server/lib/<code>/…        ← 本文重点，§3
④ 接路由              server/routes/v{N}/<code>/  ← 形态 A 可跳过，§4
⑤ 标计费 / 失败        openApiOk / openApiFail / openApiBizFail，§5
⑥ 重启 + 后台启用      manifestSync 自动建行 → 后台配置并启用，§6
⑦ 验证               重启 dev，调真实路径，gate / manifest / handler 三层都过，§7
```

---

## 3. 业务实现层（`server/lib/`）—— 本文重点

route handler 应当**薄**：解析入参、调用业务层、套响应壳。真正的逻辑（算法、数据、上游调用）放在 `server/lib/<code>/`，与 HTTP 解耦、可单测、可复用。

### 3.1 为什么是 `server/lib/` 而不是 `server/utils/`

Nitro 会对 `server/utils/**` 做**递归 auto-import 扫描**。注册中心模式（[§3.2](#32-模式-a注册中心registry)）要求 `registry.ts` 在整个进程内是**单例**——一旦落进 `server/utils/`，auto-scan 可能制造出多个实例，导致「算法注册到了 A 实例、查询却走 B 实例、列表永远为空」这类静默故障。

**规则：有 `register` / `list` 这类「跨模块共享单例状态」的业务层，一律放 `server/lib/`，绝不放 `server/utils/`。** 见 [server/lib/crypto/index.ts:1-11](../../server/lib/crypto/index.ts#L1-L11) 的注释。

### 3.2 模式 A：注册中心（registry）

以 `server/lib/crypto/` 为样板，标准四件套：

```
server/lib/crypto/
├── types.ts              契约接口 + 业务错误类（不依赖运行时，纯类型与常量）
├── registry.ts           register / getAlgorithm / listAlgorithms / normalizeParams（单例 Map）
├── index.ts              注册入口 + anchor 数组（防 tree-shake）
└── algorithms/
    ├── base64.ts         每个文件一个子项，顶层 register({...})
    ├── caesar.ts
    └── <你的新算法>.ts    ← 接入点
```

- **`types.ts`** 定义子项契约接口（[`CryptoAlgorithm`](../../server/lib/crypto/types.ts#L44-L58)）与**业务错误类** [`CryptoBusinessError`](../../server/lib/crypto/types.ts#L60-L66)（携带 `bizCode`，由 dispatcher 转 422 + 写调用日志）。注意这里用 `interface` 描述契约、用 `as const` 对象映射表达枚举集合，**不用 `enum`**。
- **`registry.ts`** 持有 `Map`，导出 [`register`](../../server/lib/crypto/registry.ts#L14-L19)（重名抛错）、`getAlgorithm`、`listAlgorithms`，以及把「校验 + 填默认 + 越界报错」集中处理的 [`normalizeParams`](../../server/lib/crypto/registry.ts#L51-L84)。
- **`algorithms/<name>.ts`** 导出纯函数 + 顶层调用 `register()`，**import 即注册**。

#### Walkthrough：给 `/v1/crypto` 加一个 `atbash` 算法

**第 1 步**——新建 `server/lib/crypto/algorithms/atbash.ts`，导出纯函数并在顶层注册：

```ts
/**
 * 埃特巴什码 (Atbash)：字母表镜像替换 A↔Z、B↔Y …… 仅处理 A-Z / a-z，
 * 其余字符原样保留。对合（加解密同构），故 exec 不区分 mode。
 */

import { register } from '../registry'

const LOWER_A = 'a'.charCodeAt(0)
const LOWER_Z = 'z'.charCodeAt(0)
const UPPER_A = 'A'.charCodeAt(0)
const UPPER_Z = 'Z'.charCodeAt(0)

export function atbashTransform(text: string): string {
  let out = ''
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (code >= LOWER_A && code <= LOWER_Z) out += String.fromCharCode(LOWER_A + LOWER_Z - code)
    else if (code >= UPPER_A && code <= UPPER_Z) out += String.fromCharCode(UPPER_A + UPPER_Z - code)
    else out += text[i]
  }
  return out
}

register({
  name: 'atbash',                                  // URL 段 + registry 主键，小写连字符，全局唯一
  title: '埃特巴什码',
  description: '字母表镜像替换：A↔Z、B↔Y …… 仅处理英文字母，对合算法。',
  modes: ['encrypt', 'decrypt'],
  exec({ text }) {
    return { text: atbashTransform(text) }
  }
})
```

**第 2 步**——到 [server/lib/crypto/index.ts](../../server/lib/crypto/index.ts) 登记**两处**（缺一不可）：

```ts
import { atbashTransform } from './algorithms/atbash'      // ① 显式 import 一个具名 export

const CRYPTO_MODULE_ANCHORS = [
  base64Encode, coreValuesEncode, /* … */ buddhaEncrypt,
  atbashTransform                                          // ② 塞进 anchor 数组
]
```

> ### ⚠️ 头号坑：anchor 数组不能漏
>
> 算法文件靠**顶层 `register()` 的副作用**完成注册，但纯 side-effect import（`import './algorithms/atbash'`）在 Rollup 生产构建下会因「该模块无明显副作用」被 **tree-shake 整条删掉**——结果 dev 正常、prod 里这个算法神秘消失。
>
> 解法就是 [index.ts:24-32](../../server/lib/crypto/index.ts#L24-L32) 那个 `CRYPTO_MODULE_ANCHORS`：把每个算法模块的**一个具名 export** 拉进一个被消费的数组，强制 Rollup 保留整条 import 链。**新加算法 = import 一个 export + 推进 anchor 数组**，两步一起做。
>
> 这是项目里 register/list 类注册中心的通用约束，不止 crypto。

**第 3 步**——**什么都不用改**。route handler [server/routes/v1/crypto/[name].post.ts](../../server/routes/v1/crypto/%5Bname%5D.post.ts) 调 `ensureCryptoRegistered()` 触发注册链后，用 `getAlgorithm(name)` 自动分发；[index.get.ts](../../server/routes/v1/crypto/index.get.ts) 的列表接口也会自动带出新算法。后台注册行已存在（复用 `(v1, crypto)`），**连第 6 步都免了**。

#### 带参数的算法

需要入参（如位移量、密钥）时，在 `register` 里声明 `params: CryptoParamSchema[]`，dispatcher 会用 `normalizeParams` 自动校验 / 填默认 / 越界报错，`exec` 拿到的是已规范化的 `params`。完整示例见 [server/lib/crypto/algorithms/caesar.ts:47-67](../../server/lib/crypto/algorithms/caesar.ts#L47-L67)（`shift` 参数）。参数语义错误时从 `exec` 抛 `CryptoBusinessError`，dispatcher 自动转 422 并写调用日志。

### 3.3 模式 B：数据源 / 仓库（repository）

形态 B 的业务层没有固定模板（取决于能力本身——数据集、上游代理、纯计算……），但 `server/lib/yiyan/` 给出了**数据源型**的参考结构：

```
server/lib/yiyan/
├── types.ts          对外/对内结构 + 用 as const 对象映射表达「合法集合」（替代 enum）
├── repository.ts     懒加载 + 内存 cache + 随机/按 id 取
├── format.ts         多格式输出（text/json/js/md）+ 字符集 + JSONP 包装
└── data/*.json       数据文件
```

两个**必须照抄的工程约定**（[repository.ts:1-30](../../server/lib/yiyan/repository.ts#L1-L30)）：

1. **dynamic import 必须用「字面量 specifier」**，一个数据文件一行：

   ```ts
   const LOADERS: Record<YiyanType, () => Promise<SentenceModule>> = {
     a: () => import('./data/a.json'),
     b: () => import('./data/b.json'),
     // …
   }
   ```

   **不要** `import(`./data/${type}.json`)`（变量插值）——Rollup / nft 静态追踪不到，构建期不会打进产物，prod 运行时解析失败。字面量写法让每个数据块各自 code-split、按需加载。

2. **首次加载后进程级缓存常驻**（`const cache = new Map(...)`，数据只读），后续命中零 IO。

输出层若涉及**多格式 / 字符集 / JSONP**（内容协商型接口），实现分工严格遵循 [对外接口落地规范 §4.0](./conventions.md#40-内容协商型接口encode-多格式输出)：`encode=json`（含默认）走标准响应壳，其余格式各自直出。绝大多数常规接口不需要这一层，只返回 JSON 壳即可。

---

## 4. 路由层（`server/routes/v{N}/<code>/`）

> 形态 A 不涉及本步。形态 B 必做。

本层的**全部规则**（路径与 `code` 目录约定、构建期 fail-fast 约束、文件名→method 映射、响应壳、入参校验）都在 [对外接口落地规范 §1–§4](./conventions.md) 里，**不在此重复**。接入时只需记住三条硬线：

1. **路径**：`server/routes/v{N}/<code>/...`，`<code>` 必须是**静态目录名**（= 数据库 `apis.code`），不能是 `[id]` 动态段。
2. **响应**：一律走 [server/utils/openApiResponse.ts](../../server/utils/openApiResponse.ts) 的 `openApiOk` / `openApiCreated` / `openApiFail`，**禁止裸 `return { ... }`**。
3. **入参校验**：需要校验 body 时用 [`readOpenApiBody`](../../server/utils/zod.ts)（失败自动返回 400 标准壳），**不要**用后台内部接口那套 `readZodBody`（失败抛 H3 错误，不符合对外契约）。

handler 应保持薄——把逻辑委托给 [§3](#3-业务实现层-serverlib-本文重点) 的业务层。最小完整示例见 [对外接口落地规范 §6](./conventions.md#6-最小完整示例) 与现有的 [server/routes/v1/yiyan/index.get.ts](../../server/routes/v1/yiyan/index.get.ts)。

---

## 5. 计费与失败标记

扣费由 [api-gate](../../server/middleware/00.api-gate.ts#L89-L130) 按本次请求 method 在 `apis.methodCosts` 里查到金额，挂到 `event.context.apiBilling`，响应发出后结算。你在 handler 里要做的只是**正确表达成功 / 失败**，扣费会自动跟随：

```
成功                       → openApiOk / openApiCreated
纯协议失败（缺参/格式错）    → openApiFail(event, 4xx, 'CODE', '提示')        // 4xx 自动跳过扣费
业务失败（算法/上游报错）    → openApiBizFail(event, 4xx/5xx, 'CODE', '提示') // 跳过扣费 + 写调用日志（errorCode/errorMessage）
返回 2xx 但要跳过扣费（罕见）→ 单独 markApiCallSuccess / markApiCallFailed
```

判定规则（[apiCallOutcome.ts:83-94](../../server/utils/apiCallOutcome.ts#L83-L94) 的 `shouldCharge`）：`costCredits<=0` 或无归属用户 → 不扣；`forcedOutcome='failed'` → 跳过；`'success'` → 必扣；默认按 statusCode（2xx/3xx 扣，4xx/5xx 不扣）。

- **业务失败优先用 [`openApiBizFail`](../../server/utils/apiCallOutcome.ts#L63-L72)**：一行完成「标记失败（跳过扣费）+ 写错误日志 + 返回标准壳」，`code`/`message` 不必传两遍。
- gate 层错误码（`MISSING_API_KEY` / `RATE_LIMITED` / `API_NOT_REGISTERED` …）登记在 [shared/config/api-guard.ts](../../shared/config/api-guard.ts#L32-L46) 的 `API_GUARD_ERROR`；业务 handler 自己的 `code`（`ALGORITHM_NOT_FOUND` / `UPSTREAM_ERROR` …）SCREAMING_SNAKE_CASE 内联即可，不必登记。

详见 [对外接口落地规范 §5](./conventions.md#5-计费标记)。

---

## 6. 重启 + 后台启用（形态 B 必做）

> **核心：注册是自动的，你只需启用。** 字段速查见 [对外接口落地规范 §7](./conventions.md#7-后台启用与配置必做)；下面讲清背后的同步机制。

**机制**：每次 `pnpm build` / 重启 `pnpm dev`，启动期插件 [server/plugins/manifestSync.ts](../../server/plugins/manifestSync.ts) 会对账 manifest 与 `apis` 表（[manifestSync.ts:3-15](../../server/plugins/manifestSync.ts#L3-L15)）：

- **manifest 有 / DB 无** → **自动以 [`DEFAULT_API_REGISTRATION`](../../shared/config/api-guard.ts#L18-L30) 入库**，但默认 `isEnabled=false`、`isApiKey=false`、`isStatistics=false`、`methodCosts={}`、分钟/小时限流 60/1000，**留待管理员启用**。
- **manifest 有 / DB 有** → 刷新 `apiPath` / `httpMethod` / `endpointCount`，自动清除 orphan 标记。
- **manifest 无 / DB 有**（源文件夹被删）→ 标记 `isOrphaned=true` 并强制禁用；行保留，管理员可改元数据但**不可重新启用**，除非文件夹回归。

**你要做的**：重启后到 **管理后台 → 接口管理**，找到自动注册进来的新接口（名字默认是 `code`），编辑并配置以下治理字段，最后**启用**它。字段定义见 [server/db/schema/api.ts:59-99](../../server/db/schema/api.ts#L59-L99)：

| 字段 | 说明 |
| --- | --- |
| `isEnabled` | 默认 `false`，**不启用则 gate 直接 503 `API_DISABLED`**。配置完务必打开 |
| `isApiKey` | 是否要求请求头 `X-API-Key`。免鉴权公共接口设 `false` |
| `isStatistics` | 是否写调用日志（`api_calls`）与每日统计（`api_call_stats`）。默认 `false`，要看统计就打开 |
| `methodCosts` | 按 method 的扣费表 jsonb，例 `{"GET":0,"POST":10}`。键缺失或为 0 = 免费。**任意方法 >0 时必须同时 `isApiKey=true`**，否则无法定位扣款账户 |
| `rateLimitPerSecond/Minute/Hour/Day` | 四级内存限流，0 = 不限 |
| `dailyQuota` | 每日调用配额，0 = 不限 |
| `scopes` / `categoryId` / `name` / `shortDesc` / `description` / `docUrl` | 展示与权限元数据 |

> **未启用前**：gate 因为 DB 行存在但 `isEnabled=false` 直接 503，这是正常现象，不是 bug。

> **`code` / `pathVersion` 是关联键，等于公开契约**：它们必须严格等于目录上的 `v{N}` + 第一层目录名。事后改名 = manifestSync 把旧行标 orphan + 建一个全新行，**丢失既有调用统计、API Key 关联、限流配置**。改名要走升版本流程（[RESTful API 设计风格 §5](./style.md#5-版本控制)）。

后台下拉里的可选项来自构建期 `#api-manifest`，所以**新文件必须先 build / 重启 dev** 才会出现。

---

## 7. 验证

接口要在 **gate → manifest → handler** 三层都通才算接入成功。改完务必**重启 `pnpm dev`**（manifest 与 Nitro 路由表都在启动期固化），再调真实路径：

```bash
# 形态 A：列表里应出现新子项
curl http://localhost:3000/v1/crypto | jq '.data.items[].name'

# 形态 A：调用新算法
curl -X POST http://localhost:3000/v1/crypto/atbash \
  -H 'Content-Type: application/json' \
  -d '{"mode":"encrypt","text":"Hello"}'

# 形态 B：调用新接口（按 isApiKey 决定是否带 -H 'X-API-Key: ...'）
curl 'http://localhost:3000/v1/<code>?foo=bar'
```

逐层对照预期：

- **403 `API_NOT_REGISTERED`** → manifestSync 还没建行（没重启）或文件路径不对。
- **503 `API_DISABLED`** → 行建了但后台没启用（[§6](#6-重启--后台启用形态-b-必做)）。
- **405 `METHOD_NOT_ALLOWED`** → 文件名 method 后缀与请求 method 不符，看 `Allow` 响应头。
- **正常 `{code,message,data,timestamp}` 壳** → 三层贯通，成功。

> 前端渲染 / 页面联调交给本地手动验证；自动化层面跑 `pnpm lint` 与 `pnpm typecheck` 即可。

---

## 8. 接入检查清单（PR 自查）

在 [对外接口落地规范 §9](./conventions.md#9-检查清单pr-自查) 之上，补充业务层与流程项：

**通用**

- [ ] 接口形状遵循 [RESTful API 设计风格](./style.md)（URL 名词复数、method 语义、状态码、版本前缀）
- [ ] 业务逻辑在 `server/lib/<code>/`，handler 保持薄；含 register/list 单例状态的模块**确认放在 `server/lib/` 而非 `server/utils/`**
- [ ] 响应全部走 `openApiOk` / `openApiCreated` / `openApiFail`，无裸 `return {}`
- [ ] 失败处理选对出口：协议失败 → `openApiFail`；业务失败 → `openApiBizFail`（一行）
- [ ] 重启 dev，按 [§7](#7-验证) 三层验证通过

**形态 A（扩展现有接口）额外**

- [ ] 子项 `name` 全局唯一、小写连字符
- [ ] **anchor 数组已更新**：`index.ts` 里既 `import` 了一个具名 export，又把它推进了 `CRYPTO_MODULE_ANCHORS`（防 tree-shake，[§3.2 头号坑](#32-模式-a注册中心registry)）

**形态 B（新建一类接口）额外**

- [ ] `<code>` 是静态目录名，等于将来注册的 `apis.code`
- [ ] dynamic import 用字面量 specifier，不用变量插值
- [ ] 后台已**启用**并配好 `isApiKey` / `methodCosts` / `rateLimit*` / `isStatistics`（[§6](#6-重启--后台启用形态-b-必做)）
- [ ] `methodCosts` 任意方法 >0 时，`isApiKey` 也已置 `true`

---

## 附：两种形态文件落点对照

| | 形态 A（加 `atbash` 算法） | 形态 B（新建 `/v1/foo`） |
| --- | --- | --- |
| 新增业务文件 | `server/lib/crypto/algorithms/atbash.ts` | `server/lib/foo/*.ts`（+ `data/` 如需） |
| 改动登记文件 | `server/lib/crypto/index.ts`（import + anchor） | — |
| 新增路由文件 | —（复用 `[name].post.ts`） | `server/routes/v1/foo/index.get.ts` 等 |
| 后台操作 | —（复用 `(v1, crypto)` 注册行） | 重启后在后台启用并配置 `(v1, foo)` |
