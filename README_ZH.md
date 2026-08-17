<div align="center">

<img src="docs/assets/brand/logo-primary.png" width="136" alt="OpenAPI 标志" />

# OpenAPI Platform

一个自托管的 API 发布、访问控制、调用统计、积分计费与运营管理平台。

[![Nuxt](https://img.shields.io/badge/Nuxt-4.x-00DC82?style=for-the-badge&logo=nuxt&logoColor=white)](https://nuxt.com) [![Nuxt UI](https://img.shields.io/badge/Nuxt_UI-4.x-00DC82?style=for-the-badge&logo=nuxt&logoColor=white)](https://ui.nuxt.com) [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%2B-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org) [![License](https://img.shields.io/badge/License-MIT-F4D03F?style=for-the-badge)](LICENSE)

[English](README.md) · [中文](README_ZH.md) · [项目文档](docs/index.md)

</div>

> [!IMPORTANT]
> Platform 与业务 API Service 是两个独立应用。Platform 不包含具体公共接口实现；官方业务接口由 `openapi-service` 提供。首个正式公开版本以 `0.1.0` 建立版本基线，`main` 分支发布的 `latest` 在此之前属于开发版本。

接口管理区位于 `/admin/apis`。连接并发现 Service 后，管理员可以直接查看 Endpoint，一键发布或停用接口，并即时调整统计、API Key、积分和限流；Platform 会在后台自动创建或复用 Product、Version、Route 和不可变发布快照。

Platform 不运行本地公共接口。具体业务接口位于独立 API Service 或 External HTTP Upstream；Platform 只负责发现契约、发布路由、访问治理、积分计费、统计和运营。

## 主要能力

- **API 管理模型**：Workspace、Product、Version、Route、Upstream、Target 与可回滚 Routing Revision。
- **Service 控制面**：按 Internal Upstream 加密保存 Token，发现 OpenAPI 与通用配置 Schema，多 Target 轮询/权重、配置同步和漂移检测。
- **网关治理**：API Key、作用域、IP 白名单、有效期、吊销、Key 配额、API 每日配额，以及秒/分/时/日限流。
- **积分计费**：按 HTTP 方法定价、可审计余额流水、幂等扣费和失败扣费重试。
- **可观测性**：不可变 Route 调用明细、登录日志、管理员操作日志、存活与就绪探针。
- **账号体系**：用户和管理员统一账号、邮箱验证、密码找回、会话失效、GitHub/QQ OAuth 绑定和 Turnstile 防刷。
- **运营后台**：用户、兑换码、每日奖励、公告、站内通知、友情链接、邮件、OAuth、验证码和站点设置。
- **生产部署**：常规生产使用 PostgreSQL；单进程轻量部署可用 PGlite；Redis 提供共享限流、短缓存与后台任务协调。

## 请求链路

1. 动态 Gateway 从活动 Routing Revision 匹配 Host、Method 和 Path。
2. Platform 检查 API Key、Scope、IP、限流和积分，并清理调用方认证头。
3. Internal Route 注入 Service Token 后代理到 `openapi-service`；External Route 使用 SSRF 防护访问标准 HTTP 上游。
4. 成功结果在响应流开始前持久化计费状态，失败结果释放预留；响应后写入 Route 调用日志与积分流水。
5. 未命中活动 Route 时返回稳定的 `API_NOT_FOUND`，Platform 不回退到本地业务 Handler。

Service 发现本身不会把接口公开到公网。管理员在接口目录明确点击发布后，Platform 才会创建公开 Route 并自动切换运行快照；发布历史只承担审计和回滚职责。

## 技术栈

- Nuxt 4、Vue 3、TypeScript、Nitro、VueUse
- Nuxt UI 4、Reka UI、Tailwind CSS 4、TanStack Table、Unovis
- Drizzle ORM、PostgreSQL 或 PGlite
- ioredis 提供 Redis 分布式协调
- Zod、Vitest、ESLint
- 独立 API Service：Node.js 24、TypeScript、Hono、Zod/OpenAPI、原生 Fetch、Vitest

## 快速开始

### 环境要求

- Node.js 24 LTS（生产镜像使用 Node 24）
- 通过 Corepack 使用 pnpm 11
- 标准生产环境使用 PostgreSQL 16+
- 本地 PGlite 开发不要求外部数据库
- Redis 在开发环境可选，在多实例生产环境必需

```bash
git clone https://github.com/NuoXianTech/openapi-platform.git
cd openapi-platform
corepack enable
pnpm install
cp .env.example .env
pnpm dev
```

启动前必须配置 `NUXT_AUTH_SECRET` 和 `NUXT_API_KEY_SECRET`。API Key 仅在创建或重置成功时返回一次完整值，兑换码仅在批量生成成功时返回一次完整值；之后列表和历史记录只显示掩码预览。数据库不保存裸明文列，可使用以下命令分别生成独立随机值：

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

开发环境未配置数据库模式时会使用 PGlite。首次启动会自动执行迁移；如果数据库中没有管理员，服务端会生成初始管理员，并仅在日志中输出一次随机密码。请立即登录并完成不可跳过的资料和密码初始化。

## 运行时配置

| 变量 | 要求 | 说明 |
| --- | --- | --- |
| `NUXT_AUTH_SECRET` | 必填 | JWT、邮箱验证、一次性 token 和 OAuth state 的签名密钥。 |
| `NUXT_API_KEY_SECRET` | 必填 | 用于生成 API Key，并分域保护 API Key、兑换码、Upstream Token 与 Service 业务 Secret。 |
| `DATABASE_URL` | 生产二选一 | PostgreSQL 连接地址。 |
| `DATABASE_DRIVER=pglite` | 生产二选一 | 不使用 PostgreSQL 时显式选择 PGlite。 |
| `PGLITE_DATA_DIR` | PGlite 生产必填 | 持久化数据目录，只允许一个 Node 进程访问。 |
| `NUXT_REDIS_URL` | 可选；多实例必填 | 共享 Redis 连接地址。 |
| `NUXT_REDIS_REQUIRED=true` | 多实例必填 | 协调关键 Redis 操作不可用时 fail-closed。 |
| `NITRO_HOST`、`NITRO_PORT` | 部署配置 | Node 服务监听地址和端口。 |

生产环境必须配置 `DATABASE_URL` 或 `DATABASE_DRIVER=pglite`，不会静默回退并创建新的本地数据库。完整语义和安全边界见[运行时配置](docs/operations/runtime-config.md)。

Platform 使用同一个访问地址提供 Console、站内 API 和公开 Gateway Route。`/api`、`/admin`、`/user` 等 Platform 路径前缀固定保留，其余路径交给动态 Gateway 匹配，不再需要配置 Host 角色环境变量。

API Service 地址和 Token 按 Internal Upstream 保存，不使用全局 Platform 环境变量。Service 声明的来源开关与凭据、数据库授权密钥、功能允许列表等业务配置会在 `/admin/apis/upstreams/:id` 自动生成表单并热更新全部 Target。

## 数据库流程

修改 `server/db/schema/` 后：

```bash
pnpm db:generate
pnpm test:run
```

`0.1.0` 建立不可修改的 `0000` 正式基线。后续 Schema 变化必须追加 `0001`、`0002` 等迁移，不能改写已经发布的迁移。`0.1.0` 之前创建的实验数据库或 Volume 不支持直接增量升级；正式 `0.1.0` 数据库则可以使用 `0.1.1` 及后续构建产物携带的迁移连续升级。详见[数据库迁移与版本升级](docs/operations/database-migrations.md)。

## 质量门禁

```bash
pnpm lint
pnpm typecheck
pnpm check:dead-code
pnpm test:unit
pnpm build
pnpm test:integration:built
```

任何命令失败都必须停止生产发布。这些构建检查在开发机或 CI 执行，不能放到生产服务器执行。

## 生产部署

### 预构建 Node Server 产物

```bash
# 仅在开发机或 CI 构建
pnpm build
# 生产服务器直接使用完整 .output 迁移并启动
NODE_ENV=production node .output/server/migrate.mjs
NODE_ENV=production node .output/server/index.mjs
```

必须部署完整的预构建 `.output`。生产入口是 `.output/server/index.mjs`，不要只部署 `.output/server`，也不能遗漏其中的隐藏 Nitro 依赖。生产服务器不执行 `pnpm install`、Nuxt Build 或 Docker Build。

### Docker

GitHub Actions 会在推送到 `main` 或创建版本标签时构建带标签的 amd64/arm64 镜像，并发布合并后的多架构镜像到 GHCR。服务器无需克隆源码或执行 Nuxt 构建：

```bash
docker network inspect openapi-network >/dev/null 2>&1 || docker network create openapi-network
docker pull ghcr.io/nuoxiantech/openapi-platform:latest
docker run -d --name openapi-platform --restart unless-stopped \
  --network openapi-network \
  -p 3000:3000 --env-file .env \
  -v openapi-data:/app/.data \
  ghcr.io/nuoxiantech/openapi-platform:latest
```

也可以先创建外部 `openapi-network`，再下载仓库中的 `docker-compose.yml` 并运行 `docker compose pull && docker compose up -d`；该 Compose 只部署 Platform，API Service 使用其独立仓库的部署文件。生产环境建议使用版本号（例如 `0.1.0`）锁定部署；`main` 发布 `latest`、`latest-amd64` 和 `latest-arm64`，用于跟踪开发版本。符合 `v*.*.*` 格式的 Git 标签会生成去掉 `v` 前缀的多架构镜像标签。若 GHCR 包为私有包，先使用有 `read:packages` 权限的 PAT 执行 `docker login ghcr.io`。

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
server/services/             路由、Service 控制面、计费和跨领域规则
server/db/                   Drizzle 客户端、schema 与迁移
server/middleware/           安全响应头与动态 Gateway 入口
server/plugins/              启动初始化、统计和重试任务
shared/                      客户端安全的 schema、契约与配置
docs/                        项目特有标准与生产流程
```

## 项目文档

- [文档入口](docs/index.md)
- [架构文档](docs/architecture/README.md)
- [Platform 架构](docs/architecture/platform.md)
- [Service 架构](docs/architecture/service.md)
- [运行时协议](docs/architecture/runtime-protocols.md)
- [版本与支持范围](docs/architecture/release-scope.md)
- [Platform 与 Service 集成测试](docs/operations/service-integration-testing.md)
- [新增公共接口开发指南](docs/api/public-api-development.md)
- [对外接口规范](docs/api/public-api-conventions.md)
- [前端工程标准](docs/standards.md)
- [API 计费规则](docs/platform/billing-rules.md)
- [运行时配置](docs/operations/runtime-config.md)
- [VPS 部署指南](docs/operations/vps-deployment.md)

## 贡献

欢迎提交 Issue 和 Pull Request。新增官方具体 API 应在独立 `openapi-service` 中实现，Platform 只负责 Upstream、Route、治理和运营。修改数据库 schema 时必须生成迁移，并执行全部质量门禁。

## 许可证

[MIT](LICENSE) © NuoXianTech
