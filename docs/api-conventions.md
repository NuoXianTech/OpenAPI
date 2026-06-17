# 对外接口（/v{N}/*）规范

适用范围：`server/routes/v{N}/**` 下所有面向调用方的 HTTP 接口。这是被 [modules/api-manifest.ts](../modules/api-manifest.ts) 扫描、被 [server/middleware/00.api-gate.ts](../server/middleware/00.api-gate.ts) 治理（鉴权 / 限流 / 配额 / 计费）的那一类。后台内部 API（`server/api/admin/**`、`server/api/user/**` 等）**不在本规范覆盖范围内**。

接口**风格层面**（URL 设计、HTTP 方法语义、响应壳结构、状态码、版本控制）一律遵循 [restful-api-style.md](./restful-api-style.md)。本文档只讲**项目落地**：目录约定、构建期约束、计费标记、后台注册等差异点。

> 想要**端到端接入流程**（业务实现层 `server/lib/` 的两种组织模式、给现有接口加算法 / 从零新建一类接口的 walkthrough、注册行的自动同步机制）见 [public-api-onboarding.md](./public-api-onboarding.md)。本文是它引用的「落地规范」层，两者配合阅读。

## 1. 路径与目录约定

外部调用路径形如 `/v{N}/<code>/...`，**不含 `/api/` 前缀**——之所以放在 `server/routes/` 而非 `server/api/`，就是为了规避 Nitro 对后者强制添加 `/api` 前缀。

```
server/routes/
└── v1/                          ← 版本目录（必须匹配 /^v\d+$/）
    └── crypto/                  ← 第一层 = apis.code，必须是静态目录名
        ├── index.get.ts         → GET  /v1/crypto
        └── [name].post.ts       → POST /v1/crypto/{name}
```

**第一层那个静态名字 = `apis.code`**（数据库 `apis` 表的业务编码），是 manifest 聚合与后台治理配置的关联键。改名等同于"删一个接口 + 新建一个接口"，会丢失既有调用统计、API Key 关联、限流配置。

## 2. 构建期强制约束

[modules/api-manifest.ts](../modules/api-manifest.ts) 在 `pnpm build` / `pnpm dev` 启动时扫描，违反以下任一约定会**构建期 fail fast**：

| # | 约束 | 抛错位置 |
| --- | --- | --- |
| 1 | `v{N}/` 下第一层不能是动态段（`[id]` / `[...slug]`） | [api-manifest.ts:183-188](../modules/api-manifest.ts#L183-L188) |
| 2 | `v{N}/index.*` 不允许（必须经过 code 目录或 `<code>.<method>.ts`） | [api-manifest.ts:203-208](../modules/api-manifest.ts#L203-L208) |
| 3 | `v{N}/[id].get.ts` 这种第一层是动态段的文件不允许 | [api-manifest.ts:210-214](../modules/api-manifest.ts#L210-L214) |
| 4 | 同一 `(method, 匹配正则)` 不能由多个文件产生（路由冲突） | [api-manifest.ts:229-240](../modules/api-manifest.ts#L229-L240) |

约束 4 拦两类歧义路由：① 同一路由两种写法并存（`crypto/index.get.ts` 与 `crypto.get.ts` 都 → `GET /v1/crypto`）；② 同形动态段换了参数名（`[name].get.ts` 与 `[id].get.ts`，路径串不同但匹配正则全等，运行时只会命中其一）。报错会同时列出两个冲突的源文件。

`code/` 内部不受这些限制：`[name]` / `[...rest]` / 嵌套子目录都正常工作，Nitro 文件路由怎么写就怎么映射。

## 3. 文件名 → method 映射

沿用 Nitro 约定，由 [api-manifest.ts:23](../modules/api-manifest.ts#L23) 的 `SOURCE_FILE_RE` 解析：

| 文件名 | 映射 |
| --- | --- |
| `xxx.get.ts` / `.post.ts` / `.put.ts` / `.delete.ts` / `.patch.ts` | 对应 HTTP method |
| `xxx.ts`（无 method 后缀） | `ANY`（任意 method） |
| `index.get.ts` | 该目录的根路径 + GET |
| `[name].post.ts` | 动态段 `:name` + POST |
| `[...rest].ts` | catch-all + ANY |

## 4. 响应壳（必须）

所有对外 endpoint **必须**通过 [server/utils/openApiResponse.ts](../server/utils/openApiResponse.ts) 的 `openApiOk` / `openApiCreated` / `openApiFail` 返回，不允许裸 `return { ... }`。

响应结构**完全对齐** [restful-api-style.md §3](./restful-api-style.md#3-响应格式)，没有项目私有扩展：

```ts
{
  code: string       // 大写下划线机器可读标识，详见 restful-api-style.md §4.4
  message: string
  data: T | null     // 失败时恒为 null
  timestamp: number  // Unix 毫秒
}
```

- **`code` 是字符串标识，不是 HTTP status 数值**：成功为 `"OK"`（`openApiOk`，200）或 `"CREATED"`（`openApiCreated`，201，POST 新建资源），失败用 `"MISSING_API_KEY"` / `"ALGORITHM_NOT_FOUND"` / `"UPSTREAM_ERROR"` 这类业务子类型。HTTP status 仍然在响应行里准确表达粗粒度类别，**两者各填各的**
- **`code` 的来源**：
  - **gate 拒绝路径**（middleware/00.api-gate.ts）一律取 [shared/config/apiGuard.ts](../shared/config/apiGuard.ts) 的 `API_GUARD_ERROR[X].code`（`MISSING_API_KEY` / `RATE_LIMITED` / `API_NOT_REGISTERED` ...），新增/调整鉴权与限流相关错误**在该表里登记**
  - **业务 handler**（`server/routes/v{N}/<code>/*` 内部）由 handler 自行命名（SCREAMING_SNAKE_CASE，如 `ALGORITHM_NOT_FOUND` / `CRYPTO_FAILED` / `UPSTREAM_ERROR`），**不必登记到全局表**，inline 字面量即可
- **`message` 由 handler 自由定**：`openApiOk` 和 `openApiFail` 的 `message` 参数都接受 handler 自定义文案，应面向调用方可读（含上下文，例如失败时 ``未知算法 "xxx"，请通过 GET /v1/crypto 查看可用列表``），不要复用 `API_GUARD_ERROR.msg`。gate 层错误的默认文案保留在 `API_GUARD_ERROR.msg`，只服务 gate 自己
- **同一 HTTP status 下用 `code` 区分子类型**：例如 401 下 `MISSING_API_KEY` / `INVALID_API_KEY` / `DISABLED_API_KEY` / `EXPIRED_API_KEY`，全部由 gate 中间件统一发码
- **失败响应 `data` 恒为 `null`**：严守 [restful-api-style.md §3.3](./restful-api-style.md#33-失败示例)，不再把 `errorCode` / `outcome` 等内部状态塞进 `data`
- **`X-Request-Id` 走响应头**：每个响应都会自动写入响应头 `X-Request-Id`（复用同名请求头的值，没有则生成 UUID），客户端排查从 header 取
- **辅助上下文走标准 HTTP 头**：405 → `Allow`、429 → `Retry-After` 与 `X-RateLimit-*`，不进 body

### 4.0 内容协商型接口（`encode` 多格式输出）

少数接口本质是**内容协商**——同一资源按 `encode` 参数返回不同表示（纯文本 / JSON / JS / Markdown 等），并可叠加 `charset`（字节编码）与 `callback`（JSONP）。这类接口按下面的分工实现，**而非「一律裸 JSON 壳」也非「一律不套壳」**：

- **`encode=json`（含未指定 encode 的默认值）必须套标准 openApiResponse 壳**（§4 的 `{code,message,data,timestamp}`），与平台其余 JSON 接口完全一致，`data` 放资源本体。
- **JSONP（`callback`）属 JSON 表示的变体，包裹的也是这同一个标准壳**——即 `callback({code,...,data})`，而非裸资源对象。
- **其他 encode（`text` / `js` / `md` / ……）由各接口自行定义原始输出格式**，直出内容并自设 `Content-Type`，不套壳。
- **`charset` 只决定响应体的字节编码，不改变结构**：`encode=json` 在 `charset=gbk` 下仍是同一个标准壳，只是用 GBK 编码（GBK 与 `callback` 不可同用）。
- **失败一律走标准壳**：参数错误 / 资源未命中等用 `openApiFail`（对应 HTTP status，`data` 恒 `null`），与 §4 完全一致，**不受 `encode` 影响**。

目前的实例是 [`/v1/yiyan`](../server/routes/v1/yiyan/index.get.ts)（随机「一言」，支持 `encode=text|json|js|md`、`charset=utf-8|gbk`、JSONP `callback`）。新增此类接口时按上面的分工实现；没有真实多格式诉求的常规接口，一律按 §4 只返回 JSON 壳。

### 4.1 入参校验（可选）

需要校验请求体时，用 [`readOpenApiBody`](../server/utils/zod.ts) —— 复用 zod，但失败**自动返回 400 标准壳**，区别于后台内部接口的 `readZodBody`（失败 `throw createError`，走 H3 默认错误格式，不符合对外契约）：

```ts
import { z } from 'zod'
import { readOpenApiBody } from '~~/server/utils/zod'
import { openApiOk } from '~~/server/utils/openApiResponse'

const BodySchema = z.object({ mode: z.enum(['encrypt', 'decrypt']), text: z.string() })

export default defineEventHandler(async (event) => {
  const parsed = await readOpenApiBody(event, BodySchema)
  if (!parsed.ok) return parsed.response   // 400 INVALID_REQUEST_BODY，已是标准壳、data 恒 null
  const { mode, text } = parsed.data       // 类型安全
  return openApiOk(event, await run(mode, text))
})
```

静态 schema 放 `shared/schemas/`（与现有 `readZodBody` 一致）。若入参 schema 随请求动态变化（如 crypto 按算法 `params` 决定校验规则），沿用 handler 内自定义校验（crypto 的 `normalizeParams`）即可，不必硬套 zod。

## 5. 计费标记

api-gate 通过后会按本次请求的 HTTP 方法在 `apis.methodCosts` 中查到本次调用的扣费金额，挂到 `event.context.apiBilling.costCredits`。同一组 `(pathVersion, code)` 下不同方法可以有不同扣费（GET 免费 / POST 收费 / PUT 收费等）。

默认按响应 statusCode 判定是否扣费（2xx/3xx 扣，4xx/5xx 不扣）。失败场景直接用对应的 HTTP status + 字符串 `code` 返回即可，扣费会自动跳过：

```ts
import { openApiFail, openApiOk } from '~~/server/utils/openApiResponse'

try {
  const data = await callUpstream()
  return openApiOk(event, data)
}
catch (err) {
  return openApiFail(event, 502, 'UPSTREAM_ERROR', '上游服务异常')
}
```

想把可读的业务失败码（`CRYPTO_FAILED` / `UPSTREAM_ERROR` 等）写入 `apiCalls.errorCode` / `errorMessage`（默认仅 `forcedOutcome='failed'` 才落库）时，用 [`openApiBizFail`](../server/utils/apiCallOutcome.ts) **一行**替代「`markApiCallFailed` + `openApiFail`」两步：

```ts
import { openApiBizFail } from '~~/server/utils/apiCallOutcome'
import { openApiOk } from '~~/server/utils/openApiResponse'

try {
  return openApiOk(event, await runAlgorithm(input))
}
catch (err) {
  // 业务失败：跳过扣费 + 把 bizCode/message 落到调用日志，一行搞定
  return openApiBizFail(event, 422, 'CRYPTO_FAILED', (err as Error).message)
}
```

极少数业务流程必须返回 2xx 但仍要跳过扣费（罕见）时，单独调 `markApiCallFailed(event, bizCode, message)`。详见 [server/utils/apiCallOutcome.ts](../server/utils/apiCallOutcome.ts) 的 `shouldCharge` 规则。

## 6. 最小完整示例

参考已有的 `/v1/crypto`：

**`server/routes/v1/crypto/index.get.ts`** — 列表接口，无参数、无业务失败分支：

```ts
import type { H3Event } from 'h3'
import { openApiOk } from '~~/server/utils/openApiResponse'

export default defineEventHandler((event: H3Event) => {
  return openApiOk(event, {
    total: 2,
    items: [{ name: 'aes' }, { name: 'rsa' }]
  })
})
```

**`server/routes/v1/crypto/[name].post.ts`** — 动态路由 + body + 业务失败标记，完整版见 [server/routes/v1/crypto/[name].post.ts](../server/routes/v1/crypto/%5Bname%5D.post.ts)。

## 7. 后台启用与配置（必做）

代码部署后，gate 会查数据库 `apis` 表。但你**不需要手动新增**这条记录：每次 `pnpm build` / 重启 `pnpm dev`，启动期插件 [manifestSync](../server/plugins/manifestSync.ts) 会对账 manifest 与 `apis` 表，把 manifest 里**新出现**的 `(pathVersion, code)` 自动入库（取 [`DEFAULT_API_REGISTRATION`](../shared/config/apiGuard.ts#L18-L30) 默认值，关键是默认 `isEnabled=false`）。

所以新接口接入后会经历两种 gate 拒绝状态，**都属正常**，按状态对症处理即可：

- **还没重启** → DB 无此行 → 403 `API_NOT_REGISTERED`（[api-gate:66-69](../server/middleware/00.api-gate.ts#L66-L69)）
- **重启后、未配置** → 行已自动建好但默认禁用 → 503 `API_DISABLED`

你要做的是去 **管理后台 → 接口管理**，找到这条自动入库的记录，配置下列治理字段并**启用**它：

| 字段 | 说明 |
| --- | --- |
| `pathVersion` + `code` | 关联键，由 manifest 自动带入（= 目录上的 `v{N}` + 第一层目录名），**不可改**；改名等同删旧建新，丢调用统计与 API Key 关联 |
| `isEnabled` | 默认 `false`，不启用则整组接口直接 503 `API_DISABLED`；配置完务必打开 |
| `isApiKey` | 是否要求请求头 `X-API-Key`，否则任意调用方可访问 |
| `scopes` | 与 API Key 的 scopes 做交集校验 |
| `methodCosts` | 按 HTTP 方法粒度的扣费表（jsonb），例 `{"GET":0,"POST":10}`。键缺失或值为 0 = 该方法免费。**任意方法 > 0 时必须同时 `isApiKey=true`**，否则无法定位扣款账户 |
| `rateLimit*` | QPS / 分钟 / 小时 / 日 限额 + 每日配额 |

manifest 来自构建期生成的 `#api-manifest` virtual module，因此**新文件必须先 build / 重启 dev**，manifestSync 才能感知并入库。

## 8. dev vs prod 行为差异

| 场景 | dev | prod |
| --- | --- | --- |
| `#api-manifest` 内容 | 每次 import 重新扫盘 | build 阶段冻结为静态字符串 |
| 新增/删除 endpoint 文件 | **建议重启 `pnpm dev`** 以确保 Nitro 路由表与 manifest 一致 | 重新 build |
| 违反约定 | dev 启动时抛错 | build 失败 |

来源：[modules/api-manifest.ts:283-297](../modules/api-manifest.ts#L283-L297)。

## 9. 检查清单（PR 自查）

- [ ] URL 设计 / HTTP 方法 / 状态码 / 版本号 遵循 [restful-api-style.md](./restful-api-style.md)
- [ ] 路径在 `server/routes/v{N}/<code>/...` 下，`<code>` 是静态目录名
- [ ] handler 通过 `openApiOk` / `openApiCreated` / `openApiFail` 返回，没有裸 `return { ... }`
- [ ] 失败用对应 HTTP status（`4xx` / `5xx`），body `code` 用大写下划线字符串（`MISSING_API_KEY` / `UPSTREAM_ERROR` ...），失败时 `data` 为 `null`
- [ ] 业务失败要把 code/message 写进调用日志 → `openApiBizFail`（一行）；纯协议失败（缺参 / 格式错）→ 直接 `openApiFail`；仅"返回 2xx 但需跳过扣费"的罕见场景 → 单用 `markApiCallFailed`
- [ ] 重启后该 `(pathVersion, code)` 已被 manifestSync 自动入库，且在后台**启用**并配好 `isApiKey` / `methodCosts` / `rateLimit*`
- [ ] 重启过 dev 服务器，调用真实路径验证 gate / manifest / handler 三层都通
