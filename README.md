# OpenAPI

[![Nuxt](https://img.shields.io/badge/Nuxt-4.4-00DC82?logo=nuxt)](https://nuxt.com)
[![Vue](https://img.shields.io/badge/Vue-3.5-42b883?logo=vue.js)](https://vuejs.org)
[![Node.js](https://img.shields.io/badge/Node.js-24.13-339933?logo=node.js)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%2B-4169E1?logo=postgresql)](https://www.postgresql.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

OpenAPI is a Nuxt 4 API service platform with API key auth, single-process
memory rate limiting, credit charging, API call logs, daily stats, admin audit
logs, notifications, OAuth providers, and site settings.

## Production Target

This project targets a single production Node server backed by PostgreSQL.

- Nitro preset: `node-server`
- Database: PostgreSQL 16+
- Rate limiting: in-process memory counters
- Background work: one Node process runs startup sync, garbage collection, and
  pending charge retries

Do not run multiple Node instances for one production database. Rate-limit
windows are intentionally reset when the Node process restarts.

## Features

- Build-time API manifest discovery from `server/routes/v{N}/`
- User registration, email verification, sessions, password reset, and OAuth
- Self-service API keys and per-method credit costs
- Memory rate limits for second, minute, hour, day, plus daily quota checks
- API call logs and daily aggregate stats
- Admin management for users, APIs, categories, redemption codes, providers,
  site settings, notifications, and operation logs
- Security defaults including hashed session IDs, scrypt password hashes, and
  AES-256-GCM encrypted OAuth secrets
- Nuxt UI v4 and Tailwind CSS v4 frontend

## Stack

| Area | Main dependencies |
| --- | --- |
| Frontend | Nuxt 4.4, Vue 3.5, Nuxt UI 4.7, Tailwind CSS 4, @unovis/vue, VeeValidate, Zod |
| Server | Nitro, Drizzle ORM 0.45, drizzle-kit, postgres.js, nodemailer |
| Database | PostgreSQL 16+ for production; pglite can be used in development |
| Tooling | TypeScript, ESLint, Vitest, @nuxt/test-utils, pnpm |

## Quick Start

### Requirements

- Node.js >= 24.15
- pnpm 11.x
- PostgreSQL 16+

### Setup

```bash
git clone https://github.com/NuoXianTech/OpenAPI.git
cd OpenAPI
pnpm install

cp .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Important Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Production: yes | PostgreSQL connection string |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Yes | Initial admin account bootstrap credentials |
| `ADMIN_EMAIL` | No | Admin display email |
| `EMAIL_VERIFY_SECRET` | Recommended | HMAC secret for email verification and OAuth state |
| `OAUTH_SECRET_KEY` | OAuth only | AES-256-GCM master key for OAuth provider secrets |

See [.env.example](.env.example) for the full single-instance production
configuration.

### Commands

```bash
pnpm db:generate   # Generate SQL migrations after schema changes
pnpm db:migrate    # Apply migrations
pnpm dev           # Start the development server
pnpm build         # Build production output
pnpm preview       # Preview the production build
pnpm lint          # Run ESLint
pnpm typecheck     # Run Nuxt TypeScript checks
```

## Project Layout

```text
app/                      Nuxt frontend
server/api/               Internal API routes
server/routes/v{N}/       Public API routes discovered by the manifest module
server/db/schema/         Drizzle schema modules
server/db/migrations/     drizzle-kit generated migrations
server/middleware/        API gate, auth, rate limit, charging, logging
server/service/           Business services
server/utils/             Shared server utilities
server/plugins/           Startup sync and scheduled single-process jobs
modules/api-manifest.ts   Build-time API manifest generator
shared/                   Shared types and config
docs/                     Project docs
```

## Deployment Notes

Run exactly one Node server process against one PostgreSQL database. PostgreSQL
stores business records only; runtime counters live only in Node memory.

The `pending_charges` table remains because it is part of billing reliability.
It stores failed charge attempts for the single process retry worker.

## Credits

This project builds on Nuxt, Nitro, Nuxt UI, Tailwind CSS, Drizzle ORM,
postgres.js, pglite, Zod, VeeValidate, Unovis, ESLint, TypeScript,
VueUse, and nodemailer.

## License

[MIT](./LICENSE) NuoXianTech
