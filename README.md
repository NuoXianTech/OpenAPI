# OpenAPI

<p>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node.js-v24.13.0-28CF8D?labelColor=18181B" alt="Node.js"></a>
  <a href="https://pnpm.io"><img src="https://img.shields.io/badge/pnpm-v10.15.0-28CF8D?labelColor=18181B" alt="pnpm"></a>
  <a href="https://nuxt.com"><img src="https://img.shields.io/badge/Nuxt-4.x-18181B?logo=nuxt" alt="Nuxt"></a>
</p>

基于 Nuxt 4（Vue 3）的全栈 API 服务平台，提供公开接口展示、用户与第三方登录、API Key 自助、积分与兑换码、调用统计、后台运营管理等能力。

后端基于 Nitro + Drizzle ORM + PostgreSQL，前端使用 Nuxt UI v4 + Tailwind CSS v4。

## 功能概览

- **公开 API**：搜索、状态筛选、结构化分类（`apiCategories`），接口元数据由构建期 manifest 从 `server/routes/v{N}/` 自动扫描生成。
- **用户体系**：注册、邮箱验证、登录、忘记密码 / 重置密码、会话管理、邮箱与密码变更、显示名。
- **第三方登录**：内置 GitHub / QQ adapter，支持 `state` 签名 Cookie 防 CSRF、code exchange、自动绑定 / 创建用户；Provider 在后台动态启用，密钥 AES-256-GCM 加密。
- **API Key 自助**：用户可在个人中心新增、删除、重置 Key。
- **积分钱包**：每用户积分余额，支持兑换码充值、调用按 `costCredits` 扣费、管理员调账。
- **API Guard**：按接口配置 QPS / 分钟 / 小时 / 日级限流与每日配额，driver 可切换 `memory` / `postgres`。
- **调用监控**：中间件自动记录调用日志并按日聚合，公共统计页展示总览、近 7 日趋势、当日 TOP 接口。
- **管理后台**：用户、API、API 分类、友情链接、FAB 菜单、公告、通知、兑换码、第三方登录 Provider、调用统计、操作日志、站点设置。
- **审计日志**：管理端关键操作写入 `operation_logs`，支持按 actor / action / resource 过滤。

## 技术栈

**前端**：Nuxt 4.4、Vue 3、Nuxt UI v4、Tailwind CSS v4、@unovis/vue（图表）、VeeValidate + Zod。

**后端**：Nuxt Server API（Nitro）、Drizzle ORM + drizzle-kit、PostgreSQL（开发可结合 pglite）、自研 Session 鉴权（仅存哈希）、AES-256-GCM 加密。

**测试 / 工程化**：Vitest + @nuxt/test-utils（e2e）、ESLint、TypeScript。

## 项目结构

```text
.
├─ app/                     # Nuxt 前端
│  ├─ pages/                # 页面（含 admin / user 子路由）
│  ├─ components/           # admin / api / common / link / stats / user
│  ├─ composables/          # auth / api list / fab-menu / link / settings ...
│  ├─ layouts/              # admin 布局
│  └─ middleware/           # auth-admin / auth-user 路由守卫
├─ server/                  # Nuxt 服务端
│  ├─ api/                  # admin / auth / user / stats / ...（管理 + 业务端点）
│  ├─ routes/v{N}/          # 对外开放的 API 实现，构建期被 manifest 扫描
│  ├─ db/
│  │  ├─ schema/            # Drizzle schema（user / auth / api / content / system）
│  │  └─ migrations/        # drizzle-kit 生成，勿手改
│  ├─ middleware/           # api-gate / api-call-stats
│  ├─ service/              # 业务服务层
│  ├─ utils/                # 鉴权、邮件、AES-GCM、OAuth、限流 driver、manifest ...
│  └─ plugins/              # manifestSync 等启动钩子
├─ modules/api-manifest.ts  # 构建期扫描 server/routes/v{N}/ 生成 manifest
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
# 1) 克隆 & 安装
git clone https://github.com/NuoXianTech/OpenAPI.git
cd OpenAPI
pnpm install

# 2) 复制环境变量
cp .env.example .env

# 3) 生成 OAUTH_SECRET_KEY（32 字节）写入 .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 4) 生成并执行数据库迁移
pnpm run db:generate
pnpm run db:migrate

# 5) 启动开发服务器
pnpm run dev
```

启动后访问 `http://localhost:3000`。

## 环境变量

| 变量名 | 必需 | 说明 |
| --- | --- | --- |
| `DATABASE_URL` | 是 | PostgreSQL 连接串 |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | 是 | 管理员账号 |
| `ADMIN_EMAIL` | 否 | 管理员展示邮箱 |
| `EMAIL_VERIFY_SECRET` | 建议 | 邮箱验证 / OAuth state 签名密钥 |
| `OAUTH_SECRET_KEY` | 启用 OAuth 时必需 | AES-256-GCM 主密钥；32 字节 hex / base64url / utf-8 |
| `API_GUARD_RATE_LIMIT_DRIVER` | 否 | `memory`（默认）/ `postgres`，多实例部署用 `postgres` |

> 站点信息、SMTP、注册策略等运行时配置读自 `site_settings` 表，可在后台「站点设置」实时修改。

## OAuth（GitHub 示例）

1. 在 GitHub Developer Settings 创建 OAuth App。
2. Callback URL 填 `http://<SITE_URL>/api/auth/oauth/github/callback`。
3. 后台 → 「第三方登录」→ 新增 Provider，填入 `clientId` / `clientSecret`（落库时自动加密）、`scopes`、`authorizeUrl` / `tokenUrl` / `userInfoUrl` / `callbackUrl`，开启 `isEnabled`。
4. 登录页将自动出现对应按钮。

回调流程（`server/api/auth/oauth/[provider]/callback.get.ts`）：校验 state Cookie（5 分钟、HMAC）→ 命中 `(provider, providerUserId)` 则登录 → 否则按 email 自动绑定到既有用户 → 仍未命中则按规则创建新用户。

## 常用命令

```bash
# 开发与构建
pnpm run dev
pnpm run build
pnpm run preview

# 数据库
pnpm run db:generate        # 由 schema.ts 生成迁移 SQL
pnpm run db:migrate         # 应用迁移

# 质量检查
pnpm run lint
pnpm run lint:fix

# 测试
pnpm run test
pnpm run test:e2e
pnpm run test:e2e:apis
pnpm run test:e2e:friend-links
pnpm run test:e2e:users
pnpm run test:e2e:calls
```

跑 e2e 前需先执行数据库迁移并在 `.env` 中设置 `OAUTH_SECRET_KEY`。复用已启动的 Nuxt 服务可设置 `NUXT_TEST_HOST=http://localhost:3000`。

## 数据库变更约定

- 仅修改 `server/db/schema/` 下的 schema 文件。
- **不要**手工编辑 `server/db/migrations/` 下的 SQL。
- 改完 schema 后 `pnpm run db:generate` → `pnpm run db:migrate`。
- 原则上**只 ADD 字段**；REMOVE / RENAME 必须确认所有代码路径已迁移完成后再生成。

## 安全约定

- 会话 Cookie 仅保存原始 sessionId，库中存 `sha256(sessionId)`。
- 密码使用 Node 内置 `scrypt`，按 `scrypt$<salt>$<hash>` 落库。
- OAuth `clientSecret` / `accessToken` / `refreshToken` 落库前 AES-256-GCM 加密，格式 `gcm$<iv>$<tag>$<cipher>`。
- OAuth state 使用签名 Cookie（`nonce.provider.returnTo.hmac`）+ 5 分钟 TTL。
- 管理端写操作统一经 `operationLogService.addLog` 留痕。

## 贡献

1. Fork 并创建分支。
2. 完成开发或修复。
3. 跑 `pnpm run lint` 与相关测试。
4. 提交 Pull Request。

## License

MIT

---

> 本项目部分代码与文档由 AI 辅助生成，提交前已人工 review。
