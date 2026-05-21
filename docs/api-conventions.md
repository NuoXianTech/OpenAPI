# 对外接口（/v{N}/*）规范

适用范围：`server/routes/v{N}/**` 下所有面向调用方的 HTTP 接口。这是被 [modules/api-manifest.ts](../modules/api-manifest.ts) 扫描、被 [server/middleware/00.api-gate.ts](../server/middleware/00.api-gate.ts) 治理（鉴权 / 限流 / 配额 / 计费）的那一类。后台内部 API（`server/api/admin/**`、`server/api/user/**` 等）**不在本规范覆盖范围内**。

接口**风格层面**（URL 设计、HTTP 方法语义、响应壳结构、状态码、版本控制）一律遵循 [restful-api-style.md](./restful-api-style.md)。本文档只讲**项目落地**：目录约定、构建期约束、计费标记、后台注册等差异点。

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
| 1 | `v{N}/` 下第一层不能是动态段（`[id]` / `[...slug]`） | [api-manifest.ts:155-160](../modules/api-manifest.ts#L155-L160) |
| 2 | `v{N}/index.*` 不允许（必须经过 code 目录或 `<code>.<method>.ts`） | [api-manifest.ts:175-180](../modules/api-manifest.ts#L175-L180) |
| 3 | `v{N}/[id].get.ts` 这种第一层是动态段的文件不允许 | [api-manifest.ts:182-186](../modules/api-manifest.ts#L182-L186) |

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

所有对外 endpoint **必须**通过 [server/utils/openApiResponse.ts](../server/utils/openApiResponse.ts) 的 `openApiOk` / `openApiFail` 返回，不允许裸 `return { ... }`。

响应结构**完全对齐** [restful-api-style.md §3](./restful-api-style.md#3-响应格式)，没有项目私有扩展：

```ts
{
  code: number       // 等于 HTTP status，无独立业务码命名空间
  message: string
  data: T | null
  timestamp: number  // Unix 毫秒
}
```

- **`code` = HTTP status**：成功 `200` / `201` / `204`，失败 `4xx` / `5xx`，按 [restful-api-style.md §4](./restful-api-style.md#4-http-状态码) 选码。**不存在** `0` 表示成功、`6xxxx` 业务侧失败这类项目内私有码 —— 业务失败也必须用对应的标准 HTTP status（参数错 `422`、上游错 `502` 等）
- **`X-Request-Id` 走响应头，不进 body**：每个响应都会自动写入响应头 `X-Request-Id`（复用同名请求头的值，没有则生成 UUID），客户端排查从 header 取，不在响应体里冗余
- **HTTP status 与 body `code` 同步**：`openApiOk(event, data)` 默认 200；`openApiFail(event, status, message)` 用传入的 HTTP status 同时设置响应行与 body `code`，二者必然一致

## 5. 计费标记

api-gate 通过后会挂 `event.context.apiBilling`，默认按响应 statusCode 判定是否扣费（2xx/3xx 扣，4xx/5xx 不扣）。失败场景直接用对应的 HTTP status 返回即可，扣费会自动跳过：

```ts
import { openApiFail, openApiOk } from '~~/server/utils/openApiResponse'

try {
  const data = await callUpstream()
  return openApiOk(event, data)
}
catch (err) {
  return openApiFail(event, 502, '上游服务异常')
}
```

若极少数业务流程必须返回 2xx 但仍要跳过扣费，可显式调用 `markApiCallFailed(event, reason, detail)`。详见 [server/utils/apiCallOutcome.ts](../server/utils/apiCallOutcome.ts) 的 `shouldCharge` 规则。

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

## 7. 后台注册（必做）

代码部署后，gate 还会查数据库 `apis` 表 —— 没登记的 `(pathVersion, code)` 一律 403 `API_NOT_REGISTERED`（[api-gate:75-78](../server/middleware/00.api-gate.ts#L75-L78)）。

新加接口后，去 **管理后台 → 接口管理 → 新增**，填：

| 字段 | 说明 |
| --- | --- |
| `pathVersion` + `code` | 必须严格等于目录上的 `v{N}` + 第一层目录名 |
| `isEnabled` | 关闭后整组接口直接 503 `API_DISABLED` |
| `isApiKey` | 是否要求请求头 `X-API-Key`，否则任意调用方可访问 |
| `scopes` | 与 API Key 的 scopes 做交集校验 |
| `costCredits` | 每次成功调用扣多少积分（0 = 免费） |
| `rateLimit*` | QPS / 分钟 / 小时 / 日 限额 + 每日配额 |

后台拉取的 manifest 来自构建期生成的 `#api-manifest` virtual module，因此**新文件需要先 build/重启 dev**才能在后台下拉里看到。

## 8. dev vs prod 行为差异

| 场景 | dev | prod |
| --- | --- | --- |
| `#api-manifest` 内容 | 每次 import 重新扫盘 | build 阶段冻结为静态字符串 |
| 新增/删除 endpoint 文件 | **建议重启 `pnpm dev`** 以确保 Nitro 路由表与 manifest 一致 | 重新 build |
| 违反约定 | dev 启动时抛错 | build 失败 |

来源：[modules/api-manifest.ts:263-275](../modules/api-manifest.ts#L263-L275)。

## 9. 检查清单（PR 自查）

- [ ] URL 设计 / HTTP 方法 / 状态码 / 版本号 遵循 [restful-api-style.md](./restful-api-style.md)
- [ ] 路径在 `server/routes/v{N}/<code>/...` 下，`<code>` 是静态目录名
- [ ] handler 通过 `openApiOk` / `openApiFail` 返回，没有裸 `return { ... }`
- [ ] 失败用对应 HTTP status（`4xx` / `5xx`）返回，没有 `0` / `6xxxx` 这类项目私有码
- [ ] 业务侧失败但 HTTP 仍 2xx 的罕见场景才需要 `markApiCallFailed`
- [ ] 后台已注册 `(pathVersion, code)` 并配好 `isEnabled` / `isApiKey` / `costCredits` / `rateLimit*`
- [ ] 重启过 dev 服务器，调用真实路径验证 gate / manifest / handler 三层都通
