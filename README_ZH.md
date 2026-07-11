<div align="center">

<img src="docs/assets/brand/logo-primary.png" width="136" alt="OpenAPI 标志" />

# OpenAPI

一个自托管的 API 发布、访问控制、调用统计、积分计费与运营管理平台。

[![Nuxt](https://img.shields.io/badge/Nuxt-4.x-00DC82?style=for-the-badge&logo=nuxt&logoColor=white)](https://nuxt.com) [![Nuxt UI](https://img.shields.io/badge/Nuxt_UI-4.x-00DC82?style=for-the-badge&logo=nuxt&logoColor=white)](https://ui.nuxt.com) [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%2B-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org) [![License](https://img.shields.io/badge/License-MIT-F4D03F?style=for-the-badge)](LICENSE)

[English](README.md) · [中文](README_ZH.md) · [项目文档](docs/index.md)

</div>

OpenAPI 将带版本的 Nitro 路由转化为可治理的公共服务：构建期发现接口，启动时同步清单，管理员可在 Nuxt UI 后台配置鉴权、价格、配额、统计与运营内容。

## 主要能力

- **API 生命周期**：构建期发现 `server/routes/v{N}/{code}`，启动注册、孤儿接口检测和后台启停。
- **网关治理**：API Key、作用域、IP 白名单、有效期、吊销、Key 配额、API 每日配额，以及秒/分/时/日限流。
- **积分计费**：按 HTTP 方法定价、可审计余额流水、幂等扣费和失败扣费重试。
- **可观测性**：不可变调用明细、每日聚合、登录日志、管理员操作日志、存活与就绪探针。
- **账号体系**：用户和管理员统一账号、邮箱验证、密码找回、会话失效、GitHub/QQ OAuth 绑定和 Turnstile 防刷。
- **运营后台**：用户、接口分类、兑换码、每日奖励、公告、站内通知、友情链接、邮件、OAuth、验证码和站点设置。
- **生产部署**：常规生产使用 PostgreSQL；单进程轻量部署可用 PGlite；Redis 提供共享限流、短缓存与后台任务协调。

## 请求链路

1. `modules/api-manifest.ts` 在构建期发现带版本的公共路由。
2. `server/plugins/00.startup.ts` 执行 Drizzle 迁移、按需创建初始管理员并同步接口清单。
3. `server/middleware/00.api-gate.ts` 检查接口配置、凭据、作用域、IP、限流、配额和积分余额。
4. 薄路由调用 `server/lib/` 的业务实现，并返回统一响应壳。
5. 响应钩子落库调用统计和积分流水；响应后扣费失败会进入幂等重试队列。

新发现的公共 API 默认处于禁用状态，必须先在管理后台完成配置并启用。

## 内置公共 API

| API | 路径 | 用途 |
| --- | --- | --- |
| Bing | `GET /v1/bing` | 获取 Bing 每日图片元数据。 |
| Crypto | `GET /v1/crypto`、`POST /v1/crypto/{name}` | 发现并运行已注册的编码或加密算法。 |
| Doubao | `GET /v1/doubao`、`/images`、`/videos` | 提取受支持分享链接中的媒体。 |
| Fuel price | `GET /v1/fuel-price`、`/regions` | 查询地区油价和支持地区。 |
| Player | `GET /v1/player`、`/art` | 获取音乐播放器数据和封面。 |
| Yiyan | `GET /v1/yiyan` | 按内容协商返回多种格式的随机语句。 |

接口是否可用、是否要求 API Key，以管理员在数据库中的实际配置为准。

## 技术栈

- Nuxt 4、Vue 3、TypeScript、Nitro、VueUse
- Nuxt UI 4、Reka UI、Tailwind CSS 4、TanStack Table、Unovis
- Drizzle ORM、PostgreSQL 或 PGlite
- ioredis 提供 Redis 分布式协调
- Zod、Vitest、ESLint

## 快速开始

### 环境要求

- Node.js 24 LTS（生产镜像使用 Node 24）
- 通过 Corepack 使用 pnpm 11
- 标准生产环境使用 PostgreSQL 16+
- 本地 PGlite 开发不要求外部数据库
- Redis 在开发环境可选，在多实例生产环境必需

```bash
git clone https://github.com/NuoXianTech/OpenAPI.git
cd OpenAPI
corepack enable
pnpm install
cp .env.example .env
pnpm dev
```

启动前必须替换 `.env` 中的两个示例密钥，并分别生成不同的随机值：

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

开发环境未配置数据库模式时会使用 PGlite。首次启动会自动执行迁移；如果数据库中没有管理员，服务端会创建初始管理员，并仅在控制台输出一次随机密码。请通过 `/login` 登录，然后完成强制的资料和密码初始化。

## 运行时配置

| 变量 | 要求 | 说明 |
| --- | --- | --- |
| `NUXT_AUTH_SECRET` | 必填 | JWT、邮箱验证、一次性 token 和 OAuth state 的签名密钥。 |
| `NUXT_AUTH_API_KEY_SECRET` | 必填 | API Key 服务端密钥，必须使用独立值。 |
| `DATABASE_URL` | 生产二选一 | PostgreSQL 连接地址。 |
| `DATABASE_DRIVER=pglite` | 生产二选一 | 不使用 PostgreSQL 时显式选择 PGlite。 |
| `PGLITE_DATA_DIR` | PGlite 生产必填 | 持久化数据目录，只允许一个 Node 进程访问。 |
| `NUXT_REDIS_URL` | 可选；多实例必填 | 共享 Redis 连接地址。 |
| `NUXT_REDIS_REQUIRED=true` | 多实例必填 | 协调关键 Redis 操作不可用时 fail-closed。 |
| `NITRO_HOST`、`NITRO_PORT` | 部署配置 | Node 服务监听地址和端口。 |

生产环境必须配置 `DATABASE_URL` 或 `DATABASE_DRIVER=pglite`，不会静默回退并创建新的本地数据库。完整语义和安全边界见[运行时配置](docs/operations/runtime-config.md)。

## 数据库流程

修改 `server/db/schema/` 后：

```bash
pnpm db:generate
pnpm test:run
```

审查并提交生成的迁移。生产迁移会打包到 `.output`，并在应用启动时自动执行。`pnpm db:migrate` 只作为手动修复或演练入口，不能代替提交迁移文件。

## 质量门禁

```bash
pnpm lint
pnpm typecheck
pnpm test:run
pnpm build
```

任何命令失败都必须停止生产发布。

## 生产部署

### Node Server

```bash
pnpm build
NODE_ENV=production pnpm start
```

必须部署完整的 `.output`。生产入口是 `.output/server/index.mjs`，不要只部署 `.output/server`，也不能遗漏其中的隐藏 Nitro 依赖。

### Docker

```bash
docker build -t openapi:latest .
docker run --rm -p 3000:3000 --env-file .env openapi:latest
```

探针检查：

```bash
curl -fsS http://127.0.0.1:3000/api/health
curl -fsS http://127.0.0.1:3000/api/ready
```

`/api/health` 是进程存活检查；`/api/ready` 检查数据库和当前 Redis required 策略。发布前后应执行[生产就绪清单](docs/operations/production-readiness.md)和[生产运行手册](docs/operations/production-runbook.md)。

## 项目结构

```text
app/                         Nuxt 页面、组件、组合式函数与 UI 资源
server/api/                  站内用户和管理员接口
server/routes/v{N}/          受网关治理的公共 API
server/lib/                  公共 API 业务实现
server/services/             事务和跨领域业务规则
server/db/                   Drizzle 客户端、schema 与迁移
server/middleware/           公共 API 网关和服务端请求守卫
server/plugins/              启动初始化、统计和重试任务
modules/api-manifest.ts      构建期公共 API 清单
shared/                      客户端安全的 schema、契约与配置
docs/                        项目特有标准与生产流程
```

## 项目文档

- [文档入口](docs/index.md)
- [公共接口接入指南](docs/api/public-api-onboarding.md)
- [对外接口规范](docs/api/public-api-conventions.md)
- [前端工程标准](docs/standards.md)
- [API 计费规则](docs/platform/billing-rules.md)
- [运行时配置](docs/operations/runtime-config.md)
- [VPS 部署指南](docs/operations/vps-deployment.md)

## 致谢

部分内置公开 API 基于或参考了以下项目：

- [emoji-aes](https://github.com/a8763506128977812212307169331690/emoji-aes)
- [taiji-encode](https://github.com/Cat7373/taiji-encode)
- [beast_sdk](https://github.com/SycAlright/beast_sdk)
- [Core-Values-Encoder](https://github.com/wTool/Core-Values-Encoder)
- [talk-with-buddha](https://github.com/takuron/talk-with-buddha)
- [sentences-bundle](https://github.com/hitokoto-osc/sentences-bundle)
- [doubao-nomark](https://github.com/ihmily/doubao-nomark)
- [60s](https://github.com/vikiboss/60s)

## 贡献

欢迎提交 Issue 和 Pull Request。新增公共 API 时，请遵循接入指南、保持 handler 简洁、补充或更新测试；修改数据库 schema 时必须生成迁移，并执行全部质量门禁。

## 许可证

[MIT](LICENSE) © NuoXianTech
