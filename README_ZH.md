<div align="center">

<img src="docs/assets/brand/logo-primary.png" width="136" alt="OpenAPI 图标" />

## OpenAPI

一个集接口发布、访问控制、用量计量、积分管理和用户运营于一体的 API 服务平台。

[![Nuxt](https://img.shields.io/badge/Nuxt-4.x-00DC82?style=for-the-badge&logo=nuxt&logoColor=white)](https://nuxt.com) [![Vue](https://img.shields.io/badge/Vue-3.5-42B883?style=for-the-badge&logo=vue.js&logoColor=white)](https://vuejs.org) [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%2B-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org) [![License](https://img.shields.io/badge/License-MIT-F4D03F?style=for-the-badge)](LICENSE)

[EN](README.md) | [中文](README_ZH.md)

</div>

OpenAPI 可以帮助你把开放接口变成一个真正可运营的服务。你可以发布接口，为用户分配访问密钥，查看调用情况，管理积分，发送公告，并在清晰的管理后台中完成日常维护。它适合个人开发者和小团队，用一套自托管平台完成接口开放、用户服务和运营管理，而不需要东拼西凑多个系统。

### 它如何工作？

OpenAPI 会把 `server/routes/v{N}/{code}/` 下的文件视为公开 API。构建时，`modules/api-manifest` 会扫描这些路由并生成接口清单；服务启动时，清单会同步进当前配置的数据库，管理员随后可以在后台启用接口、分配分类、配置价格，并控制访问策略。

- 公开请求会先经过 `server/middleware/00.api-gate.ts`，统一检查接口状态、API Key、作用域、IP 白名单、限流、每日配额与积分余额。

- 路由 handler 保持轻量，只处理入参、调用业务层，并返回统一的 OpenAPI 响应壳。

- 响应发出后写入调用日志与每日统计，收费调用会进入积分流水。

- 扣费失败会写入 `pending_charges`，重试任务由 Redis lease 协调，多实例下仅一个扫描者执行。

默认生产模型是**一个 Node/Nitro 进程 + 一个项目自维护数据库**。PostgreSQL 更适合常规生产；PGlite 用于轻量、自包含的单进程部署。需要横向扩展时使用 PostgreSQL、共享 Redis 和 `NUXT_REDIS_REQUIRED=true`，由 Redis 协调限流、缓存和后台任务。

### 功能亮点

- 构建期公开接口发现，并在启动时同步数据库。

- 用户和管理员账号支持注册、邮箱验证、找回密码、修改邮箱、会话失效、GitHub OAuth 与 QQ OAuth 绑定。

- API Key 支持作用域、IP 白名单、总配额、有效期、吊销与使用快照。

- 按接口与 HTTP 方法配置积分价格，带不可变积分流水与可重试扣费队列。

- 公共 API 网关和身份防刷支持秒、分、时、天多窗口限流；默认使用进程内存，可选 Redis 共享原子计数并支持生产环境显式 fail-closed。

- 不可变 API 调用日志、按日聚合统计、后台操作审计日志与登录日志。

- 兑换码、每日签到积分、公告、友情链接与站内通知。

- 后台管理用户、接口、分类、积分、内容、OAuth 提供商、站点设置、日志、数据分析与项目信息。

- 默认安全设计包括无状态 JWT 会话、scrypt 密码哈希、HMAC 一次性 token、私有页面服务端守卫、登录/注册/找回密码/签到统一 Turnstile 校验与不可变审计记录。

### 内置接口

| 接口 | 路径 | 说明 |
| --- | --- | --- |
| Crypto | `GET /v1/crypto`, `POST /v1/crypto/{name}` | 列出并执行已注册的加密 / 编码算法。 |
| Yiyan | `GET /v1/yiyan` | 随机返回一句一言，支持 JSON、文本、JavaScript、Markdown、GBK 与 JSONP。 |
| Doubao | `GET /v1/doubao/images`, `GET /v1/doubao/videos` | 从支持的豆包、千问、云雀分享链接中提取图片或视频。 |

### 使用方法

#### 环境要求

- Node.js `>= 24.15`
- PostgreSQL `16+`，或用于单进程轻量部署的 PGlite

#### 开发

将项目 clone 到本地：

```bash
git clone https://github.com/NuoXianTech/OpenAPI.git && cd OpenAPI
```

安装依赖：

```bash
pnpm install
```

准备环境变量文件：

```bash
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

启动开发服务器：

```bash
pnpm dev
```

#### 数据库

修改 Drizzle schema 后生成迁移：

```bash
pnpm db:generate
```

应用迁移：

```bash
pnpm db:migrate
```

#### 生产

构建应用：

```bash
pnpm build
```

本地预览生产构建：

```bash
pnpm preview
```

生成后的生产入口是 `.output/server/index.mjs`。构建产物会包含数据库迁移文件，生产 Node/Nitro 进程启动时会先自动运行迁移，再接受请求。完整的单实例 VPS 部署流程见 [docs/operations/vps-deployment.md](docs/operations/vps-deployment.md)。

### 配置

项目通过运行时环境变量读取生产配置。最重要的变量如下：

| 变量 | 是否必填 | 说明 |
| --- | --- | --- |
| `DATABASE_URL` 或 `DATABASE_DRIVER=pglite` | 生产必填 | PostgreSQL 连接串，或显式选择 PGlite。 |
| `NUXT_AUTH_SECRET` | 必填 | access JWT、邮箱验证 token 与 OAuth state 共用的 HS256/HMAC 签名密钥；为空时鉴权 fail-closed。 |
| `NUXT_AUTH_API_KEY_SECRET` | 推荐 | API Key 相关操作的服务端密钥。 |
| `NUXT_REDIS_URL` | 可选 | 共享原子限流使用的 Redis 连接地址。 |
| `NUXT_REDIS_REQUIRED` | 使用 Redis 时推荐 | 设置为 `true` 后 Redis 限流不可用会 fail-closed。 |

生产使用 PGlite 时，请设置 `DATABASE_DRIVER=pglite`，并把 `PGLITE_DATA_DIR` 放在会持久化和备份的位置。生产环境没有 `DATABASE_URL` 时必须显式选择 PGlite，避免 PostgreSQL 漏配后静默创建新的本地数据库。

如果启动时不存在管理员账号，服务端会自动创建 `admin`，随机密码只输出到控制台。
初始邮箱为 `admin@openapi.com`。首次登录后，如果账号仍使用初始用户名或邮箱，系统会显示一次初始化弹窗，用于确认用户名、邮箱并强制设置新密码；后续除首次初始化流程外不允许修改用户名，以保证审计可追溯。

部署前请基于当前 Drizzle schema 生成数据库迁移；生产启动会自动应用已随 `.output` 发布的迁移。

完整的单实例配置见 [.env.example](.env.example)。

### 目录结构

```text
app/                      Nuxt 前端
server/api/               内部用户与管理 API 路由
server/routes/v{N}/       由清单模块发现的公开 API
server/db/schema/         Drizzle schema 模块
server/db/migrations/     drizzle-kit 生成的迁移
server/middleware/        API 网关与私有页面守卫
server/services/          业务服务层
server/lib/               公开 API 业务实现
server/plugins/           启动同步与分布式协调后台任务
modules/api-manifest.ts   构建期接口清单生成器
shared/                   共享类型、schema 与配置
docs/                     项目文档
```

### 常用命令

```bash
pnpm dev           # 启动开发服务器
pnpm build         # 构建生产产物
pnpm preview       # 预览生产构建
pnpm db:generate   # 生成数据库迁移
pnpm db:migrate    # 应用数据库迁移
pnpm lint          # 运行 ESLint
pnpm lint:fix      # 自动修复 ESLint 问题
pnpm typecheck     # 运行 Nuxt TypeScript 检查
pnpm test:run      # 单次运行测试
pnpm test:unit     # 单次运行单元测试
```

### 项目文档

- [项目文档入口](docs/index.md)
- [公共接口接入指南](docs/api/public-api-onboarding.md)
- [RESTful API 设计风格](docs/api/design-style.md)
- [API 计费规则](docs/platform/billing-rules.md)
- [VPS 部署指南](docs/operations/vps-deployment.md)

### 致谢

部分内置公开 API 基于或参考了以下项目：

- [emoji-aes](https://github.com/a8763506128977812212307169331690/emoji-aes)
- [taiji-encode](https://github.com/Cat7373/taiji-encode)
- [beast_sdk](https://github.com/SycAlright/beast_sdk)
- [Core-Values-Encoder](https://github.com/wTool/Core-Values-Encoder)
- [talk-with-buddha](https://github.com/takuron/talk-with-buddha)
- [sentences-bundle](https://github.com/hitokoto-osc/sentences-bundle)
- [doubao-nomark](https://github.com/ihmily/doubao-nomark)
- [60s](https://github.com/vikiboss/60s)

### 贡献

欢迎任何 issue 与 PR。如果你希望新增公开 API，请先阅读 [docs/api/public-api-onboarding.md](docs/api/public-api-onboarding.md)。

### 许可证

[MIT](LICENSE) NuoXianTech
