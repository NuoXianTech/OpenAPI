# OpenAPI

[![Nuxt](https://img.shields.io/badge/Nuxt-4.4-00DC82?logo=nuxt)](https://nuxt.com)
[![Vue](https://img.shields.io/badge/Vue-3.5-42b883?logo=vue.js)](https://vuejs.org)
[![Node.js](https://img.shields.io/badge/Node.js-24.13-339933?logo=node.js)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%2B-4169E1?logo=postgresql)](https://www.postgresql.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> 基于 Nuxt 4 全栈框架打造的 API 公共接口服务平台 — 内置 API Key 鉴权、限流、积分扣费、调用监控与管理后台，开箱即用。

## 特性

- **接口自动发现** — 构建期扫描 [server/routes/v{N}/](server/routes/) 零配置生成 API manifest（[接口约定](docs/api-conventions.md)）
- **完整用户体系** — 邮箱注册/验证/重置、会话鉴权、第三方登录（GitHub / QQ）
- **API Key 鉴权** — 用户中心自助管理，按 `methodCosts` 按 HTTP 方法粒度自动扣费
- **多级限流** — QPS / 分钟 / 小时 / 日 + 每日配额，driver 自动适配（memory / postgres / kv）
- **调用监控** — 中间件记录调用日志，按日聚合并提供公共统计页 + TOP 接口榜单
- **管理后台** — 用户 / API / 分类 / 兑换码 / Provider / 站点设置 / 操作审计
- **安全底座** — 会话 ID 仅存 sha256、scrypt 密码哈希、OAuth 密钥 AES-256-GCM 加密落库
- **现代界面** — Nuxt UI v4 + Tailwind CSS v4，深浅色 + 命令面板（Ctrl/⌘+K）

## 技术栈

| 类别 | 主要依赖 |
| --- | --- |
| 前端 | Nuxt 4.4 · Vue 3.5 · Nuxt UI 4.7 · Tailwind CSS 4 · @unovis/vue · VeeValidate + Zod |
| 服务端 | Nitro · Drizzle ORM 0.45 · drizzle-kit · postgres.js · nodemailer |
| 数据库 | PostgreSQL 16+（dev 可走 pglite，自动落到 `.data/`） |
| 工程化 | TypeScript · ESLint · Vitest + @nuxt/test-utils · pnpm |

## 快速开始

### 环境要求

- Node.js >= 24.15
- pnpm 11.x
- PostgreSQL 16+（dev 可省略，自动走 pglite）

### 安装与配置

```bash
git clone https://github.com/NuoXianTech/OpenAPI.git
cd OpenAPI
pnpm install

cp .env.example .env
# 生成 EMAIL_VERIFY_SECRET / OAUTH_SECRET_KEY（各 32 字节 hex）
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

| 变量 | 必需 | 说明 |
| --- | --- | --- |
| `DATABASE_URL` | 否 | PostgreSQL 连接串，dev 留空自动走 pglite |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | 是 | 首次启动以此账号注册超管，之后可在后台改 |
| `ADMIN_EMAIL` | 否 | 管理员展示邮箱 |
| `EMAIL_VERIFY_SECRET` | 建议 | 邮箱验证码 / OAuth state HMAC 签名密钥 |
| `OAUTH_SECRET_KEY` | 启用 OAuth 时必需 | AES-256-GCM 主密钥（32 字节 hex / base64url / utf-8） |

### 运行

```bash
pnpm db:generate   # 由 schema.ts 生成迁移 SQL（仅在改了 schema 后跑）
pnpm db:migrate    # 应用迁移
pnpm dev           # 启动开发服务器 → http://localhost:3000
```

### 常用命令

```bash
pnpm build         # 构建生产产物
pnpm preview       # 预览生产构建
pnpm lint          # ESLint 检查
```

## 项目结构

```text
.
├─ app/                      Nuxt 前端
│  ├─ pages/                 页面（admin / user / 公共）
│  ├─ components/            admin · user · dashboard · common · api · stats · link
│  ├─ composables/           auth · admin/* · user/* · dashboard/*
│  ├─ constants/             dashboard-config.ts 等
│  ├─ layouts/middleware/    后台布局 + auth-admin / auth-user 守卫
├─ server/                   Nuxt 服务端
│  ├─ api/                   内部 API（admin / auth / user / stats / ...）
│  ├─ routes/v{N}/           对外开放接口，构建期被 manifest 扫描（约定见 docs/api-conventions.md）
│  ├─ db/schema/             Drizzle schema（user · auth · api · content · system）
│  ├─ db/migrations/         drizzle-kit 生成，勿手改
│  ├─ middleware/            api-gate（限流 + 鉴权 + 计费）
│  ├─ service/               业务服务层
│  ├─ lib/                   注册中心（如限流 driver、OAuth provider 适配）
│  └─ utils/ plugins/        AES-GCM、OAuth、邮件、manifest 同步等
├─ modules/api-manifest.ts   构建期扫描生成 manifest
├─ shared/                   前后端共享类型
├─ docs/                     部署 + 规范文档
```

## OAuth 接入（GitHub 示例）

1. GitHub Developer Settings 新建 OAuth App，Callback URL 填 `${siteUrl}/callback/openid/0`
   （索引顺序同 [shared/types/oauth.ts](shared/types/oauth.ts) 中 `SUPPORTED_OAUTH_PROVIDERS`：`0=github`、`1=qq`）
2. 后台 → **第三方登录** → 新增 Provider，填 `clientId` / `clientSecret`（落库自动 AES-GCM 加密）、`scopes`、`authorizeUrl` / `tokenUrl` / `userInfoUrl` / `callbackUrl`，开启 `isEnabled`
3. 登录页将自动出现对应按钮

回调流程见 [server/routes/callback/openid/[index].get.ts](server/routes/callback/openid/) 与 [server/utils/oauthCallback.ts](server/utils/)：
state Cookie 校验（5 min HMAC）→ 命中 `(provider, providerUserId)` 则登录 → 否则按 email 自动绑定既有用户 → 仍未命中则按规则创建新用户。

## 鸣谢

本项目站在巨人的肩膀上，感谢以下开源项目：

- [Nuxt](https://nuxt.com) · [Nitro](https://nitro.build) — 全栈框架与服务端引擎
- [Nuxt UI](https://ui.nuxt.com) · [Tailwind CSS](https://tailwindcss.com) — 设计系统与样式底座
- [Drizzle ORM](https://orm.drizzle.team) · [drizzle-kit](https://orm.drizzle.team/kit-docs/overview) — 类型安全的 SQL 与迁移
- [postgres.js](https://github.com/porsager/postgres) · [pglite](https://pglite.dev) — PostgreSQL 驱动与嵌入式实例
- [Zod](https://zod.dev) · [VeeValidate](https://vee-validate.logaretm.com) — 校验与表单
- [@unovis/vue](https://unovis.dev) — 图表
- [NuxtHub](https://hub.nuxt.com) — 一键 Cloudflare 部署支持

以及 Vitest、ESLint、TypeScript、@vueuse/core、nodemailer 等众多优秀工具。

## 贡献

欢迎 PR 与 Issue。提交前请跑 `pnpm lint` 与相关测试。如果项目对你有帮助，欢迎点一个 ⭐ Star。

## License

[MIT](./LICENSE) © NuoXianTech

---

> 本项目部分代码与文档由 AI 辅助生成，提交前已人工 review。
