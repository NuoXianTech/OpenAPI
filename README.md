<div align="center">

<img src="docs/assets/brand/logo-primary.png" width="136" alt="OpenAPI logo" />

# OpenAPI

A self-hosted API publishing, access control, usage metering, credit billing, and operations platform.

[![Nuxt](https://img.shields.io/badge/Nuxt-4.x-00DC82?style=for-the-badge&logo=nuxt&logoColor=white)](https://nuxt.com) [![Nuxt UI](https://img.shields.io/badge/Nuxt_UI-4.x-00DC82?style=for-the-badge&logo=nuxt&logoColor=white)](https://ui.nuxt.com) [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%2B-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org) [![License](https://img.shields.io/badge/License-MIT-F4D03F?style=for-the-badge)](LICENSE)

[English](README.md) · [中文](README_ZH.md) · [Documentation](docs/index.md)

</div>

OpenAPI turns versioned Nitro routes into governed public services. It discovers endpoints at build time, synchronizes their manifest at startup, and lets operators configure access, pricing, quotas, statistics, and content from Nuxt UI dashboards.

## Features

- **API lifecycle** — build-time discovery for `server/routes/v{N}/{code}`, startup registration, orphan detection, and admin-controlled activation.
- **Gateway governance** — API keys, scopes, IP allowlists, expiration, revocation, per-key quotas, API daily quotas, and second/minute/hour/day rate limits.
- **Credit billing** — per-method pricing, auditable balance transactions, idempotent charging, and retryable pending charges.
- **Observability** — immutable call details, daily aggregates, login history, admin operation logs, health and readiness probes.
- **Identity** — unified user/admin accounts, email verification, password recovery, session invalidation, GitHub and QQ OAuth binding, and Turnstile abuse protection.
- **Operations** — users, API categories, redemption codes, daily rewards, announcements, notifications, friend links, mail, OAuth, CAPTCHA, and site settings.
- **Production options** — PostgreSQL for normal production, PGlite for one-process lightweight deployments, and Redis for shared limits, short caches, and worker coordination.

## Request lifecycle

1. `modules/api-manifest.ts` discovers versioned public routes during build.
2. `server/plugins/00.startup.ts` applies Drizzle migrations, creates the first administrator when necessary, and synchronizes the manifest.
3. `server/middleware/01-open-api-routing.ts` rejects unknown public paths and unsupported methods before Nuxt page rendering.
4. `defineOpenApiEventHandler` in `server/utils/api-guard.ts` validates API configuration, credentials, scopes, IP rules, limits, quotas, and available credits.
5. Thin route handlers call implementations from `server/lib/` and use the built-in public API handler context for query data, caller metadata, timeout signals, and standard responses.
6. Response hooks persist call statistics and credit transactions; failed post-response charges enter an idempotent retry queue.

Newly discovered APIs are disabled by default. Configure and enable them in the admin dashboard before exposing them.

## Built-in public APIs

| API | Endpoints | Purpose |
| --- | --- | --- |
| Bing | `GET /v1/bing` | Bing daily image metadata. |
| Crypto | `GET /v1/crypto`, `POST /v1/crypto` | Discover and run registered encoders or ciphers. |
| Doubao | `GET /v1/doubao`, `/images`, `/videos` | Extract supported share-link media. |
| Exchange rate | `GET /v1/exchange-rate` | Query exchange rates with JSON, text, or Markdown output. |
| Fuel price | `GET /v1/fuel-price`, `/regions` | Query regional fuel prices and supported regions. |
| Maoyan | `GET /v1/maoyan/**` | Query global movie box office, realtime movie box office, TV ratings, and web-series heat. |
| Music | `GET /v1/music` | Search and resolve songs through one NetEase, Tencent, KuGou, Baidu, or Kuwo entry point. |
| Player | `GET /v1/player`, `/art` | Music player data and cover art. |
| Short video | `GET /v1/short-video` | Resolve supported video, image, or live-photo shares with one `url` parameter. |
| Yiyan | `GET /v1/yiyan` | Random sentences in several negotiated output formats. |

Availability and authentication depend on the database configuration set by an administrator.

## Technology

- Nuxt 4, Vue 3, TypeScript, Nitro, VueUse
- Nuxt UI 4, Reka UI, Tailwind CSS 4, TanStack Table, Unovis
- Drizzle ORM with PostgreSQL or PGlite
- Redis via ioredis for distributed coordination
- Zod, Vitest, ESLint

## Quick start

### Requirements

- Node.js 24 LTS (the production image uses Node 24)
- pnpm 11 via Corepack
- PostgreSQL 16+ for standard production; no external database is required for local PGlite development
- Redis is optional for development and required for coordinated multi-instance production

```bash
git clone https://github.com/NuoXianTech/OpenAPI.git
cd OpenAPI
corepack enable
pnpm install
cp .env.example .env
pnpm dev
```

Before starting, configure `NUXT_AUTH_SECRET` and `NUXT_API_KEY_SECRET`. API keys and redemption codes are stored as HMAC lookup digests plus AES-256-GCM ciphertext, so authorized users can view them again without plaintext being stored in the database. Generate independent values with:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

The development server uses PGlite when no database mode is configured. On first startup, the server applies migrations and creates an administrator if none exists. A generated initial password is printed once to the server log; sign in and complete the mandatory profile and password initialization immediately.

## Runtime configuration

| Variable | Requirement | Description |
| --- | --- | --- |
| `NUXT_AUTH_SECRET` | Required | JWT, verification token, one-time token, and OAuth state signing secret. |
| `NUXT_API_KEY_SECRET` | Required | Generates API keys and protects encrypted API keys and redemption codes stored in the database. |
| `DATABASE_URL` | Production option | PostgreSQL connection URL. |
| `DATABASE_DRIVER=pglite` | Production option | Explicitly selects PGlite when PostgreSQL is not used. |
| `PGLITE_DATA_DIR` | PGlite production | Persistent directory; only one Node process may use it. |
| `NUXT_REDIS_URL` | Optional / multi-instance required | Shared Redis connection URL. |
| `NUXT_REDIS_REQUIRED=true` | Multi-instance required | Fails closed when coordination-critical Redis operations are unavailable. |
| `NITRO_HOST`, `NITRO_PORT` | Deployment | Node server listen address and port. |

Production must define either `DATABASE_URL` or `DATABASE_DRIVER=pglite`; it never silently falls back to a new local database. See [runtime configuration](docs/operations/runtime-config.md) for the complete behavior and security boundaries.

## Database workflow

After changing files under `server/db/schema/`:

```bash
pnpm db:generate
pnpm test:run
```

Review and commit the generated migration. Production migrations are bundled into `.output` and run automatically during startup. Use `pnpm db:migrate` as a manual repair or rehearsal command, not as a substitute for committed migrations.

## Quality checks

```bash
pnpm lint
pnpm typecheck
pnpm test:run
pnpm build
```

A failed check must stop a production release.

## Production

### Node server

```bash
pnpm build
NODE_ENV=production pnpm start
```

Deploy the complete `.output` directory. The executable entry is `.output/server/index.mjs`; do not deploy only `.output/server` or omit its hidden Nitro dependencies.

### Docker

GitHub Actions builds tagged amd64 and arm64 images on pushes to `main` and version tags, then publishes a multi-platform image to GHCR. The server does not need to clone the source or run the Nuxt build:

```bash
docker pull ghcr.io/nuoxiantech/openapi:latest
docker run -d --name openapi --restart unless-stopped \
  -p 3000:3000 --env-file .env \
  -v openapi-data:/app/.data \
  ghcr.io/nuoxiantech/openapi:latest
```

Alternatively, download `compose.yml` and run `docker compose pull && docker compose up -d`. Replace `latest` with a release version such as `0.1.0` to pin deployments. Versioned images are published only from Git tags matching `v*.*.*`: for example, Git tag `v0.1.0` produces multi-platform tag `0.1.0` plus architecture tags `0.1.0-amd64` and `0.1.0-arm64`. The `main` branch similarly publishes `latest`, `latest-amd64`, and `latest-arm64`. Image tags omit the Git tag’s leading `v` by container ecosystem convention; do not create the Git tag without the leading `v`. If the GHCR package is private, run `docker login ghcr.io` first with a PAT that has `read:packages`.

Useful probes:

```bash
curl -fsS http://127.0.0.1:3000/api/health
curl -fsS http://127.0.0.1:3000/api/ready
```

`/api/health` is a liveness check. `/api/ready` checks the database and the configured Redis readiness policy. Follow the [production readiness checklist](docs/operations/production-readiness.md) and [runbook](docs/operations/production-runbook.md) before and after a release.

## Project structure

```text
app/                         Nuxt pages, components, composables, and UI assets
server/api/                  Internal user/admin endpoints
server/routes/v{N}/          Governed public APIs
server/lib/                  Public API business implementations
server/services/             Transactions and cross-domain business rules
server/db/                   Drizzle client, schema, and migrations
server/middleware/           Security headers and public route guards
server/plugins/              Startup initialization, statistics, and retry workers
modules/api-manifest.ts      Build-time public API manifest
shared/                      Client-safe schemas, contracts, and configuration
docs/                        Project-specific standards and operational workflows
```

## Documentation

- [Documentation index](docs/index.md)
- [Public API development guide](docs/api/public-api-development.md)
- [Public API conventions](docs/api/public-api-conventions.md)
- [Frontend engineering standards](docs/standards.md)
- [Billing rules](docs/platform/billing-rules.md)
- [Runtime configuration](docs/operations/runtime-config.md)
- [VPS deployment](docs/operations/vps-deployment.md)

## Credits

Some built-in public APIs are based on or inspired by:

- [emoji-aes](https://github.com/a8763506128977812212307169331690/emoji-aes)
- [taiji-encode](https://github.com/Cat7373/taiji-encode)
- [beast_sdk](https://github.com/SycAlright/beast_sdk)
- [Core-Values-Encoder](https://github.com/wTool/Core-Values-Encoder)
- [talk-with-buddha](https://github.com/takuron/talk-with-buddha)
- [sentences-bundle](https://github.com/hitokoto-osc/sentences-bundle)
- [doubao-nomark](https://github.com/ihmily/doubao-nomark)
- [60s](https://github.com/vikiboss/60s)
- [Meting](https://github.com/metowolf/Meting)
- [Meting-API](https://github.com/metowolf/Meting-API)

## Contributing

Issues and pull requests are welcome. For a new public endpoint, follow the onboarding guide, keep handlers thin, add or update tests, generate migrations when the schema changes, and run all quality checks.

## License

[MIT](LICENSE) © NuoXianTech
