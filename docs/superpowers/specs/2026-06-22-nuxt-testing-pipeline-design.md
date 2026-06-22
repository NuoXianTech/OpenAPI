# Nuxt Testing Pipeline Design

## Purpose

Set up the project's test workflow according to the Nuxt 4 testing guide, while preserving the existing fast server unit tests.

## Current State

- The project already uses Nuxt 4, Vitest, pnpm, and TypeScript.
- Existing tests live under `tests/server/**` and run in a Node environment.
- `pnpm test:run` currently passes with 4 files and 16 tests.
- There is no GitHub Actions workflow yet.

## Recommended Approach

Use Vitest projects:

- `unit`: runs existing server and shared unit tests in `node`.
- `nuxt`: runs Nuxt runtime tests in `environment: 'nuxt'`.

This follows the Nuxt documentation's recommended separation between fast unit tests and tests that need a Nuxt app runtime.

## Dependencies

Add Nuxt's official testing support:

- `@nuxt/test-utils`
- `@vue/test-utils`
- `happy-dom`

Keep `vitest` as the runner because the project already uses it and Nuxt runtime unit testing currently supports Vitest.

## Configuration

- Update `vitest.config.ts` to use `defineVitestProject` from `@nuxt/test-utils/config`.
- Keep existing root aliases for Node tests.
- Include `tests/server/**/*.{test,spec}.ts` in the `unit` project.
- Include `tests/nuxt/**/*.{test,spec}.ts` in the `nuxt` project.
- Add `@nuxt/test-utils/module` to `nuxt.config.ts` so Nuxt DevTools can discover the test integration during development.

## Scripts

Keep the existing scripts:

- `pnpm test` for watch mode.
- `pnpm test:run` for CI mode.

Add targeted scripts:

- `pnpm test:unit`
- `pnpm test:nuxt`

## CI

Create a GitHub Actions workflow that runs on pushes and pull requests:

1. Check out the repository.
2. Install pnpm.
3. Set up Node.js with pnpm cache.
4. Install dependencies with `pnpm install --frozen-lockfile`.
5. Run `pnpm lint`.
6. Run `pnpm typecheck`.
7. Run `pnpm test:run`.
8. Run `pnpm build`.

## Verification

The implementation is complete when:

- `pnpm test:run` passes.
- `pnpm lint` passes.
- `pnpm typecheck` passes.
- `pnpm build` passes or any build-time environment requirement is documented.
- The GitHub Actions workflow uses the same commands as local verification.
