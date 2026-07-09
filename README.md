<div align="center">

<img src="docs/assets/brand/logo-primary.png" width="136" alt="OpenAPI icon" />

## OpenAPI

A unified API service platform for publishing endpoints, controlling access, metering usage, managing credits, and operating users.

[![Nuxt](https://img.shields.io/badge/Nuxt-4.x-00DC82?style=for-the-badge&logo=nuxt&logoColor=white)](https://nuxt.com) [![Vue](https://img.shields.io/badge/Vue-3.5-42B883?style=for-the-badge&logo=vue.js&logoColor=white)](https://vuejs.org) [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%2B-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org) [![License](https://img.shields.io/badge/License-MIT-F4D03F?style=for-the-badge)](LICENSE)

[EN](README.md) | [中文](README_ZH.md)

</div>

OpenAPI helps you turn public APIs into a manageable service. You can publish APIs, give users their own access keys, track usage, manage credits, send announcements, and run daily operations from a clean admin console. It is designed for small teams and individual builders who want a practical, self-hosted platform without stitching together a pile of separate tools.

### How does it work?

OpenAPI treats files under `server/routes/v{N}/{code}/` as public APIs. During build, `modules/api-manifest` scans those routes and produces a manifest; when the server starts, the manifest is synchronized into the configured database so administrators can enable APIs, assign categories, configure pricing, and control access from the dashboard.

- Public requests pass through `server/middleware/00.api-gate.ts`, where API status, API keys, scopes, IP allowlists, rate limits, daily quotas, and credit balance are checked.

- Route handlers keep business logic thin and return a consistent OpenAPI response envelope.

- Call logs and daily aggregates are written after responses are sent, and paid calls are charged through the credit ledger.

- Failed charge attempts are stored in `pending_charges` and retried by the same Node process.

The production target is intentionally simple: **one Node/Nitro process plus one project-owned database**. PostgreSQL is recommended for normal production; PGlite is supported for lightweight single-process deployments. Runtime counters live in memory, so running multiple Node processes against the same production database is not supported.

### Highlights

- Build-time API discovery with startup database synchronization.

- User and admin accounts with email verification, password reset, email change, session invalidation, GitHub OAuth, and QQ OAuth binding.

- API keys with scopes, IP allowlists, total quotas, expiry, revocation, and usage snapshots.

- Credit billing per API and HTTP method, with immutable credit transactions and retryable pending charges.

- Public API gateway rate limits per API and caller API key or IP, with second, minute, hour, and day windows backed by process memory.

- Immutable API call logs, per-day statistics, admin audit logs, and login logs.

- Redemption codes, daily check-in credits, announcements, friend links, and site notifications.

- Admin dashboards for users, APIs, categories, credits, content, OAuth providers, site settings, logs, analytics, and project information.

- Security-oriented defaults: stateless JWT sessions, scrypt password hashes, HMAC one-time tokens, server-side private page guards, unified login/register/reset/check-in Turnstile checks, and immutable audit trails.

### Built-in APIs

| API | Endpoint | Description |
| --- | --- | --- |
| Crypto | `GET /v1/crypto`, `POST /v1/crypto/{name}` | Lists and runs registered encryption / encoding algorithms. |
| Yiyan | `GET /v1/yiyan` | Returns a random sentence with JSON, text, JavaScript, Markdown, GBK, and JSONP variants. |
| Doubao | `GET /v1/doubao/images`, `GET /v1/doubao/videos` | Extracts images or videos from supported Doubao, Qianwen, and Yunque share links. |

### Usage

#### Requirements

- Node.js `>= 24.15`
- PostgreSQL `16+` or PGlite for single-process lightweight deployments

#### Development

Clone the project:

```bash
git clone https://github.com/NuoXianTech/OpenAPI.git && cd OpenAPI
```

Install dependencies:

```bash
pnpm install
```

Prepare the environment file:

```bash
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Start the development server:

```bash
pnpm dev
```

#### Database

Generate migrations after changing the Drizzle schema:

```bash
pnpm db:generate
```

Apply migrations:

```bash
pnpm db:migrate
```

#### Production

Build the application:

```bash
pnpm build
```

Preview the production build:

```bash
pnpm preview
```

The generated production entry is `.output/server/index.mjs`. The build output includes database migration files, and the production Node/Nitro process runs migrations automatically before accepting requests. See [docs/operations/vps-deployment.md](docs/operations/vps-deployment.md) for the full single-instance VPS guide.

### Configuration

The project reads production settings from runtime environment variables. The most important ones are:

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` or `DATABASE_DRIVER=pglite` | Production required | PostgreSQL connection string, or explicit PGlite selection. |
| `NUXT_AUTH_SECRET` | Required | Shared HS256/HMAC signing secret for access JWTs, email verification tokens and OAuth state. Authentication fails closed when empty. |
| `NUXT_AUTH_API_KEY_SECRET` | Recommended | Server-side secret for API key operations. |

If production uses PGlite, set `DATABASE_DRIVER=pglite` and put `PGLITE_DATA_DIR` on persistent storage that is included in backups. Without a `DATABASE_URL`, production requires the explicit driver to avoid silent database creation after a missed PostgreSQL configuration.

If no administrator exists on startup, the server creates `admin` with a random password and prints it to the console.
The initial email is `admin@openapi.com`. After the first login, an onboarding dialog appears once when the account still uses the initial username or email; it lets the administrator confirm username, email, and a new password. Later username changes are intentionally blocked outside this first-run flow to preserve auditability.

Generate database migrations from the current Drizzle schema before deployment; production startup applies the migrations shipped with `.output`.

See [.env.example](.env.example) for the complete single-instance configuration.

### Project layout

```text
app/                      Nuxt frontend
server/api/               Internal user and admin API routes
server/routes/v{N}/       Public APIs discovered by the manifest module
server/db/schema/         Drizzle schema modules
server/db/migrations/     drizzle-kit generated migrations
server/middleware/        API gateway and private page guards
server/services/          Business services
server/lib/               Public API business implementations
server/plugins/           Startup sync and single-process background jobs
modules/api-manifest.ts   Build-time API manifest generator
shared/                   Shared types, schemas, and configuration
docs/                     Project documentation
```

### Commands

```bash
pnpm dev           # Start the development server
pnpm build         # Build for production
pnpm preview       # Preview the production build
pnpm db:generate   # Generate database migrations
pnpm db:migrate    # Apply database migrations
pnpm lint          # Run ESLint
pnpm lint:fix      # Fix ESLint issues
pnpm typecheck     # Run Nuxt TypeScript checks
pnpm test:run      # Run tests once
pnpm test:unit     # Run unit tests once
```

### Documentation

- [Project documentation](docs/index.md)
- [Public API onboarding](docs/api/public-api-onboarding.md)
- [API design style](docs/api/design-style.md)
- [Billing rules](docs/platform/billing-rules.md)
- [VPS deployment](docs/operations/vps-deployment.md)

### Credits

Some built-in public APIs are based on or inspired by:

- [emoji-aes](https://github.com/a8763506128977812212307169331690/emoji-aes)
- [taiji-encode](https://github.com/Cat7373/taiji-encode)
- [beast_sdk](https://github.com/SycAlright/beast_sdk)
- [Core-Values-Encoder](https://github.com/wTool/Core-Values-Encoder)
- [talk-with-buddha](https://github.com/takuron/talk-with-buddha)
- [sentences-bundle](https://github.com/hitokoto-osc/sentences-bundle)
- [doubao-nomark](https://github.com/ihmily/doubao-nomark)
- [60s](https://github.com/vikiboss/60s)

### Contributing

Issues and PRs are welcome. If you want to add a public API, start with [docs/api/public-api-onboarding.md](docs/api/public-api-onboarding.md).

### License

[MIT](LICENSE) NuoXianTech
