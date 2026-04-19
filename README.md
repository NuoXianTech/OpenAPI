# OpenAPI

<p>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node.js-v24.13.0-28CF8D?labelColor=18181B" alt="Node.js"></a>
  <a href="https://pnpm.io"><img src="https://img.shields.io/badge/pnpm-v10.15.0-28CF8D?labelColor=18181B" alt="pnpm"></a>
  <a href="https://nuxt.com"><img src="https://img.shields.io/badge/Nuxt-4.x-18181B?logo=nuxt" alt="Nuxt"></a>
  <a href="#"><img src="https://img.shields.io/badge/AI--assisted-part%20generated%20by%20Claude-8A63D2?labelColor=18181B" alt="AI-assisted"></a>
</p>

OpenAPI 是一个基于 Nuxt 4（Vue 3）的全栈 API 服务平台，覆盖公开接口展示、用户注册/第三方登录、API Key 自助管理、后台运营管理、调用统计看板与审计日志。

项目采用 Nuxt 4 新目录结构（前端在 `app/`，服务端在 `server/`），后端基于 Nitro + Drizzle ORM + PostgreSQL，前端使用 Nuxt UI v4 + Tailwind CSS v4。

> ⚠️ 项目中部分代码（含后端服务层、CRUD 端点、前端组件与 README 本文档）由 AI（Claude / Claude Code）辅助生成，提交前已人工 review 与调整。使用前请结合自身业务继续审阅与测试。

## 功能概览

- **公开 API 列表**：搜索、状态筛选、分类筛选（基于结构化 `apiCategories` 表）。
- **用户体系**：注册、邮箱验证、登录、会话管理、邮箱/密码变更。
- **第三方登录**：GitHub OAuth 登录打样，支持 `state` 签名 Cookie 防 CSRF、code exchange、email 自动绑定或创建新用户。
- **API Key 自助**：用户可在个人后台新增、删除、重置 API Key。
- **管理员后台**：用户管理、API 管理、API 分类、友情链接、FAB 菜单、公告、第三方登录 Provider、调用统计、操作日志、站点设置。
- **调用监控**：中间件自动记录 API 调用日志并聚合为日维度统计。
- **公共统计页**：总览、近 7 日趋势、当日 TOP 调用接口等指标。
- **应用层加密**：OAuth `clientSecret` / `accessToken` / `refreshToken` 采用 AES-256-GCM 加密后落库。
- **审计日志**：管理端关键操作写入 `operation_logs`，支持按 actor/action/resource 过滤。

## 技术栈

**前端**

- Nuxt 4.4.x / Vue 3
- Nuxt UI v4（`@nuxt/ui`）
- Tailwind CSS v4
- @unovis/vue（图表）
- VeeValidate + Zod（表单校验）

**后端**

- Nuxt Server API（Nitro）
- Drizzle ORM + drizzle-kit
- PostgreSQL（开发阶段也可结合 pglite）
- 自研 Session 鉴权（sessionId 仅存哈希）
- AES-256-GCM OAuth 密钥加密（`server/utils/oauthCrypto.ts`）

**测试与工程化**

- Vitest + @nuxt/test-utils（e2e）
- ESLint（含 `lint` / `lint:fix`）
- TypeScript

## 项目结构

```text
.
├─ app/                     # Nuxt 前端
│  ├─ pages/                # 页面路由（含 admin 子路由）
│  │  ├─ admin/             # 后台：apis / users / friend-links / calls / oauth-providers / settings ...
│  │  ├─ login.vue          # 用户登录（含第三方登录按钮）
│  │  ├─ register.vue
│  │  └─ verify-email.vue
│  ├─ components/           # 业务组件
│  │  ├─ admin/             # 后台 Modal / 表单
│  │  ├─ api/               # 公开 API 列表、卡片、筛选
│  │  ├─ common/            # 页头、页脚、搜索栏、FabMenu
│  │  ├─ link/              # 友情链接
│  │  └─ stats/             # 公共统计图表
│  ├─ composables/          # auth / api list / fab-menu / link / site settings ...
│  ├─ layouts/              # 后台 admin 布局
│  └─ middleware/           # auth-admin / auth-user 路由守卫
├─ server/                  # Nuxt 服务端
│  ├─ api/
│  │  ├─ admin/             # 管理端 CRUD（apis / users / friend-links / fab-menu / oauth-providers / ...）
│  │  ├─ auth/              # 注册 / 登录 / 邮箱验证 / OAuth（start + callback）
│  │  ├─ user/              # 当前用户相关（apikeys / request-email-change）
│  │  ├─ stats/ announcements/ api-categories/ fab-menu/ friend-links/ settings/
│  │  └─ list.get.ts        # 公开 API 列表
│  ├─ db/
│  │  ├─ schema/            # Drizzle schema（user / auth / api / content / system）
│  │  ├─ schema.ts          # 汇总导出
│  │  └─ migrations/        # 由 drizzle-kit 生成，勿手改
│  ├─ middleware/           # api-call-stats（调用统计中间件）
│  ├─ service/              # 业务服务层（userService / apiService / oauthProviderService ...）
│  └─ utils/                # 鉴权、邮件、AES-GCM、OAuth state、GitHub adapter ...
├─ shared/                  # 前后端共享类型
├─ tests/e2e/               # e2e 测试
├─ .env.example
└─ nuxt.config.ts
```

## 环境要求

- Node.js >= 24.13.0
- pnpm
- PostgreSQL 16+

## 快速开始

```bash
# 1) 克隆项目
git clone https://github.com/NuoXianTech/OpenAPI.git
cd OpenAPI

# 2) 安装依赖
pnpm install

# 3) 复制环境变量
cp .env.example .env

# 4) 生成 OAUTH_SECRET_KEY（32 字节）并填入 .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 5) 生成并执行数据库迁移
pnpm run db:generate
pnpm run db:migrate

# 6) 启动开发服务器
pnpm run dev
```

Windows PowerShell 可使用：

```powershell
Copy-Item .env.example .env
```

启动后默认访问：`http://localhost:3000`

## 环境变量

| 变量名 | 必需 | 说明 |
| --- | --- | --- |
| `DATABASE_URL` | 是 | PostgreSQL 连接串 |
| `ADMIN_USERNAME` | 是 | 管理员用户名 |
| `ADMIN_PASSWORD` | 是 | 管理员密码 |
| `ADMIN_EMAIL` | 否 | 管理员展示邮箱 |
| `EMAIL_VERIFY_SECRET` | 建议 | 邮箱验证 / OAuth state 签名密钥 |
| `OAUTH_SECRET_KEY` | 启用 OAuth 时必需 | AES-256-GCM 主密钥；32 字节 hex / base64url / utf-8 |
| `SITE_URL` | 否 | 站点地址，影响邮件验证链接、OAuth callback |
| `SITE_NAME` / `SITE_DESCRIPTION` / `SITE_IMG` | 否 | 站点展示信息默认值 |
| `START_TIME` | 否 | 首页运行时长起始时间 |
| `SESSION_MAX_AGE` | 否 | Session 有效期（秒） |
| `EMAIL_VERIFY_EXPIRES_IN` | 否 | 邮箱验证链接有效期（分钟） |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` | 否 | SMTP 服务配置（仅用作 `siteSettings` 初始化默认） |
| `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | 否 | SMTP 鉴权与发件默认 |

> SMTP 运行时配置读自 `site_settings` 表，可在管理后台「站点设置」页面实时修改；上表中的 `SMTP_*` 仅作为首次初始化默认值。

示例见 `.env.example`：

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=123456
ADMIN_EMAIL=admin@example.com
EMAIL_VERIFY_SECRET=openapi-email-verify-secret
OAUTH_SECRET_KEY=<32 字节 hex>
DATABASE_URL=postgresql://user:password@localhost:5432/OpenApi
```

## OAuth 第三方登录（GitHub 打样）

1. 在 [GitHub Developer Settings](https://github.com/settings/developers) 创建 OAuth App。
2. Callback URL 填 `http://<SITE_URL>/api/auth/oauth/github/callback`。
3. 登录管理后台 → 「第三方登录」→ 新增 Provider：
   - `provider`: `github`
   - `clientId` / `clientSecret`: GitHub 提供（写入时自动 AES-256-GCM 加密，列表展示为 `***`）
   - `scopes`: `read:user,user:email`
   - `authorizeUrl`: `https://github.com/login/oauth/authorize`
   - `tokenUrl`: `https://github.com/login/oauth/access_token`
   - `userInfoUrl`: `https://api.github.com/user`
   - `callbackUrl`: 同上第 2 步
   - `isEnabled`: 开
4. 前台登录页会自动出现「GitHub 登录」按钮。
5. 回调逻辑（`server/api/auth/oauth/[provider]/callback.get.ts`）：
   - 校验签名 state Cookie（5 分钟有效，HMAC 复用 `EMAIL_VERIFY_SECRET`）
   - `(provider, providerUserId)` 命中 → 直接登录已绑定用户
   - GitHub email 命中既有本地用户 → 自动绑定到该用户
   - 均未命中 → 创建新用户（`isActive=true`，`emailVerifiedAt=now`）并绑定

## 常用命令

```bash
# 开发与构建
pnpm run dev
pnpm run build
pnpm run preview

# 数据库
pnpm run db:generate        # 读 schema.ts 生成迁移 SQL
pnpm run db:migrate         # 应用迁移

# 质量检查
pnpm run lint
pnpm run lint:fix

# 测试
pnpm run test
pnpm run test:e2e
pnpm run test:e2e:ci
pnpm run test:e2e:apis
pnpm run test:e2e:friend-links
pnpm run test:e2e:users
pnpm run test:e2e:calls
```

## 测试说明

- e2e 入口位于 `tests/e2e/`。
- 运行 e2e 前请确保数据库迁移已完成、`.env` 已配置 `OAUTH_SECRET_KEY`（否则启动时加密工具会抛错）。
- 如需复用已启动的 Nuxt 服务，可设置 `NUXT_TEST_HOST`：

```bash
# Linux / macOS
NUXT_TEST_HOST=http://localhost:3000 pnpm run test:e2e
```

```powershell
# Windows PowerShell
$env:NUXT_TEST_HOST='http://localhost:3000'; pnpm run test:e2e
```

## 数据库变更约定

- 仅修改 `server/db/schema/` 中的 schema 文件。
- **不要**手工编辑 `server/db/migrations/` 下的 SQL。
- 改完 schema 后运行 `pnpm run db:generate` 生成迁移，再 `pnpm run db:migrate` 应用。
- 原则上**只 ADD 字段**；需要 REMOVE / RENAME 时务必确认已有代码路径都迁完，再生成 drop 列迁移。

## 安全相关约定

- 会话 Cookie 只保存原始 sessionId，数据库里存 `sha256(sessionId)`。
- 密码使用 Node 内置 `scrypt`，按 `scrypt$<salt>$<hash>` 落库。
- OAuth `clientSecret` / `accessToken` / `refreshToken` 落库前均经 AES-256-GCM 加密，格式 `gcm$<iv>$<tag>$<cipher>`。
- OAuth state 使用签名 Cookie（`nonce.provider.returnTo.hmac`）+ 5 分钟 TTL，防 CSRF。
- 管理端写操作统一经 `operationLogService.addLog` 留痕。

## 开发参考

- Nuxt 4 文档：<https://nuxt.com/docs/4.x/getting-started/introduction>
- NuxtHub 文档：<https://hub.nuxt.com/docs/getting-started>
- Nuxt UI 文档：<https://ui.nuxt.com>
- Drizzle ORM 文档：<https://orm.drizzle.team>

## 贡献指南

1. Fork 本仓库并创建分支。
2. 完成功能开发或修复。
3. 运行 `pnpm run lint` 与相关测试命令。
4. 提交 Pull Request。

## AI 协作声明

本仓库在开发过程中使用了 Anthropic Claude（主要通过 Claude Code CLI）进行代码生成与辅助编写，涉及范围包括但不限于：

- 数据库 schema 扩容方案、Drizzle ORM 建表语法
- 后端服务层 / 管理端 CRUD 端点骨架
- AES-256-GCM 加密工具、OAuth state 签名 Cookie、GitHub OAuth adapter
- 前端表单组件、后台列表 / 新增 / 编辑 Modal、路由守卫
- 本 README 以及若干注释文案

所有 AI 生成内容均经过维护者人工 review、调整与测试后才合并入主分支；仓库历史与 commit 信息中亦会对 AI 协作做相应说明。

## License

MIT
