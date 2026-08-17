<div align="center">

<img src="docs/assets/brand/logo-primary.png" width="136" alt="OpenAPI logo" />

# OpenAPI Platform

A self-hosted API publishing, access control, usage metering, credit billing, and operations platform.

[![Nuxt](https://img.shields.io/badge/Nuxt-4.x-00DC82?style=for-the-badge&logo=nuxt&logoColor=white)](https://nuxt.com) [![Nuxt UI](https://img.shields.io/badge/Nuxt_UI-4.x-00DC82?style=for-the-badge&logo=nuxt&logoColor=white)](https://ui.nuxt.com) [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%2B-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org) [![License](https://img.shields.io/badge/License-MIT-F4D03F?style=for-the-badge)](LICENSE)

[English](README.md) · [中文](README_ZH.md) · [Documentation](docs/index.md)

</div>

> [!IMPORTANT]
> Platform and the business API Service are separate applications. Platform contains no concrete public API implementation; first-party business endpoints are provided by `openapi-service`. The first formal public release establishes the `0.1.0` baseline, and `latest` builds from `main` are development versions until then.

The API management area is available at `/admin/apis`. After connecting and discovering a Service, operators can inspect its endpoints, publish or disable them in one action, and change statistics, API-key, credit, and limit policies immediately. Platform creates or reuses the Product, Version, Route, and immutable release snapshot behind the workflow.

Platform does not run built-in public API handlers. Business endpoints live in an independent API Service or an External HTTP Upstream; Platform owns contract discovery, routing, access governance, credit billing, usage data, and operations.

## Features

- **API management model** — Workspaces, Products, Versions, Routes, Upstreams, Targets, and rollback-capable Routing Revisions.
- **Service control plane** — encrypted per-Upstream tokens, OpenAPI and generic configuration discovery, round-robin/weighted Targets, configuration synchronization, and drift status.
- **Gateway governance** — API keys, scopes, IP allowlists, expiration, revocation, per-key quotas, API daily quotas, and second/minute/hour/day rate limits.
- **Credit billing** — per-method pricing, auditable balance transactions, idempotent charging, and retryable pending charges.
- **Observability** — immutable Route call details, login history, admin operation logs, health and readiness probes.
- **Identity** — unified user/admin accounts, email verification, password recovery, session invalidation, GitHub and QQ OAuth binding, and Turnstile abuse protection.
- **Operations** — users, redemption codes, daily rewards, announcements, notifications, friend links, mail, OAuth, CAPTCHA, and site settings.
- **Production options** — PostgreSQL for normal production, PGlite for one-process lightweight deployments, and Redis for shared limits, short caches, and worker coordination.

## Request lifecycle

1. The dynamic Gateway matches Host, Method, and Path from the active Routing Revision.
2. Platform enforces API keys, scopes, IP rules, limits, and credit reservations while stripping caller authentication headers.
3. Internal Routes receive the Service Token and proxy to `openapi-service`; External Routes use SSRF-protected standard HTTP upstreams.
4. Chargeable outcomes are persisted before response streaming begins, failed outcomes release reservations, and response hooks write Route call logs and credit transactions.
5. Unmatched requests return a stable `API_NOT_FOUND`; Platform never falls back to a built-in business handler.

Service discovery alone never exposes an endpoint publicly. Once an operator explicitly publishes it from the endpoint catalog, Platform creates the public Route and activates a new runtime snapshot automatically; release history is reserved for audit and rollback.

## Technology

- Nuxt 4, Vue 3, TypeScript, Nitro, VueUse
- Nuxt UI 4, Reka UI, Tailwind CSS 4, TanStack Table, Unovis
- Drizzle ORM with PostgreSQL or PGlite
- Redis via ioredis for distributed coordination
- Zod, Vitest, ESLint
- Separate API Service: Node.js 24, TypeScript, Hono, Zod/OpenAPI, native Fetch, Vitest

## Quick start

### Requirements

- Node.js 24 LTS (the production image uses Node 24)
- pnpm 11 via Corepack
- PostgreSQL 16+ for standard production; no external database is required for local PGlite development
- Redis is optional for development and required for coordinated multi-instance production

```bash
git clone https://github.com/NuoXianTech/openapi-platform.git
cd openapi-platform
corepack enable
pnpm install
cp .env.example .env
pnpm dev
```

Before starting, configure `NUXT_AUTH_SECRET` and `NUXT_API_KEY_SECRET`. A complete API key is returned only after creation or reset, and complete redemption codes are returned only after generation. Lists and history expose masked previews only; the database has no plaintext secret columns. Generate independent values with:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

The development server uses PGlite when no database mode is configured. On first startup, the server applies migrations and creates an administrator if none exists. A generated initial password is printed once to the server log; sign in and complete the mandatory profile and password initialization immediately.

## Runtime configuration

| Variable | Requirement | Description |
| --- | --- | --- |
| `NUXT_AUTH_SECRET` | Required | JWT, verification token, one-time token, and OAuth state signing secret. |
| `NUXT_API_KEY_SECRET` | Required | Generates API keys and domain-separates encryption for API keys, redemption codes, Upstream tokens, and Service business secrets. |
| `DATABASE_URL` | Production option | PostgreSQL connection URL. |
| `DATABASE_DRIVER=pglite` | Production option | Explicitly selects PGlite when PostgreSQL is not used. |
| `PGLITE_DATA_DIR` | PGlite production | Persistent directory; only one Node process may use it. |
| `NUXT_REDIS_URL` | Optional / multi-instance required | Shared Redis connection URL. |
| `NUXT_REDIS_REQUIRED=true` | Multi-instance required | Fails closed when coordination-critical Redis operations are unavailable. |
| `NITRO_HOST`, `NITRO_PORT` | Deployment | Node server listen address and port. |

Production must define either `DATABASE_URL` or `DATABASE_DRIVER=pglite`; it never silently falls back to a new local database. See [runtime configuration](docs/operations/runtime-config.md) for the complete behavior and security boundaries.

Platform exposes the Console, internal APIs, and public Gateway Routes from one address. Platform-owned path prefixes such as `/api`, `/admin`, and `/user` are reserved; every other path is resolved by the dynamic Gateway. No hostname-role environment variables are required.

API Service addresses and tokens are stored per Internal Upstream instead of in a global Platform environment variable. Business settings declared by a Service—such as source switches and credentials, database license keys, or feature allowlists—are rendered generically at `/admin/apis/upstreams/:id` and synchronized to every Target.

## Database workflow

After changing files under `server/db/schema/`:

```bash
pnpm db:generate
pnpm test:run
```

`0.1.0` establishes the immutable `0000` baseline. Later schema changes must append `0001`, `0002`, and subsequent migrations; never rewrite a migration that has shipped. Development databases and volumes created before the `0.1.0` baseline cannot upgrade incrementally, while a production `0.1.0` database can upgrade through the migrations bundled with `0.1.1` and later artifacts. See [database migrations and version upgrades](docs/operations/database-migrations.md).

## Quality checks

```bash
pnpm lint
pnpm typecheck
pnpm check:dead-code
pnpm test:unit
pnpm build
pnpm test:integration:built
```

A failed check must stop a production release. Run these build checks on a development machine or in CI, never on the production server.

## Production

### Prebuilt Node server artifact

```bash
# Build only on a development machine or in CI
pnpm build
# The production server migrates and starts from the uploaded complete .output
NODE_ENV=production node .output/server/migrate.mjs
NODE_ENV=production node .output/server/index.mjs
```

Deploy the complete prebuilt `.output` directory. The executable entry is `.output/server/index.mjs`; do not deploy only `.output/server` or omit its hidden Nitro dependencies. Production servers must not run `pnpm install`, Nuxt builds, or Docker builds.

### Docker

GitHub Actions builds tagged amd64 and arm64 images on pushes to `main` and version tags, then publishes a multi-platform image to GHCR. The server does not need to clone the source or run the Nuxt build:

```bash
docker network inspect openapi-network >/dev/null 2>&1 || docker network create openapi-network
docker pull ghcr.io/nuoxiantech/openapi-platform:latest
docker run -d --name openapi-platform --restart unless-stopped \
  --network openapi-network \
  -p 3000:3000 --env-file .env \
  -v openapi-data:/app/.data \
  ghcr.io/nuoxiantech/openapi-platform:latest
```

Alternatively, create the external `openapi-network`, download `docker-compose.yml`, and run `docker compose pull && docker compose up -d`. This Compose file deploys Platform only; the API Service uses the deployment files from its own repository. Production deployments should pin a release version such as `0.1.0`. The `main` branch publishes `latest`, `latest-amd64`, and `latest-arm64` for development tracking. Git tags matching `v*.*.*` produce multi-platform image tags without the leading `v`. If the GHCR package is private, run `docker login ghcr.io` first with a PAT that has `read:packages`.

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
server/services/             Routing, Service control, billing, and cross-domain rules
server/db/                   Drizzle client, schema, and migrations
server/middleware/           Security headers and the dynamic Gateway entry
server/plugins/              Startup initialization, statistics, and retry workers
shared/                      Client-safe schemas, contracts, and configuration
docs/                        Project-specific standards and operational workflows
```

## Documentation

- [Documentation index](docs/index.md)
- [Architecture documentation](docs/architecture/README.md)
- [Platform architecture](docs/architecture/platform.md)
- [Service architecture](docs/architecture/service.md)
- [Runtime protocols](docs/architecture/runtime-protocols.md)
- [Version and support scope](docs/architecture/release-scope.md)
- [Platform and Service integration testing](docs/operations/service-integration-testing.md)
- [Public API development guide](docs/api/public-api-development.md)
- [Public API conventions](docs/api/public-api-conventions.md)
- [Frontend engineering standards](docs/standards.md)
- [Billing rules](docs/platform/billing-rules.md)
- [Runtime configuration](docs/operations/runtime-config.md)
- [VPS deployment](docs/operations/vps-deployment.md)

## Contributing

Issues and pull requests are welcome. New first-party business APIs belong in the separate `openapi-service`; Platform owns Upstreams, Routes, governance, and operations. Generate migrations when the schema changes and run all quality checks.

## License

[MIT](LICENSE) © NuoXianTech
