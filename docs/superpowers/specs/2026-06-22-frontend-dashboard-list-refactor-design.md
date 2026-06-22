# Frontend Dashboard List Refactor Design

## Goal

Refactor the high-traffic dashboard list pages so they are easier to maintain, more consistent, and safer to evolve. The first pass focuses on admin and user dashboard list workflows, plus the shared composables that directly support filtering, pagination, URL state, table rendering, and modal/detail interactions.

## Scope

Included in this design:

- `app/pages/admin/logs.vue`
- `app/pages/user/logs.vue`
- `app/pages/admin/users/index.vue`
- `app/pages/user/apikeys.vue`
- `app/composables/dashboard/usePrivatePagedList.ts`
- A new dashboard list-state composable under `app/composables/dashboard/`
- Focused business components or helpers extracted from the listed pages when they reduce page size and isolate behavior
- Tests for new shared state and pagination behavior
- A stable verification path for linting, type checking, and the Nuxt runtime test timeout observed during baseline testing

Not included in this pass:

- Public page visual redesigns such as home, stats, public API cards, or friend links
- Backend API contract rewrites beyond what is required to preserve existing list behavior
- A full migration of every modal in the app to `useOverlay()`
- Broad design-system changes outside the dashboard list surfaces

## Current State

The project is Nuxt 4 with Nuxt UI 4, Tailwind CSS 4, VueUse, strict TypeScript, Vitest, and Nuxt test utilities. Existing dashboard conventions are documented in `docs/frontend/dashboard.md`.

The codebase already has useful shared pieces:

- `DashboardDataTable` centralizes table, empty state, and pagination UI.
- `usePrivatePagedList` protects private list data from being serialized into SSR payloads.
- `useClientPagination` supports small in-memory admin lists.
- `useConfirmDialog` centralizes destructive confirmation flows.

The main remaining issue is that several dashboard list pages still own too many concerns directly: filter forms, pagination state, URL state, table columns, row actions, detail modals, copy/reset flows, and data fetching live together in the page component. This makes behavior harder to test and causes inconsistencies across similar pages.

Baseline verification:

- `pnpm lint` passes.
- `pnpm typecheck` passes.
- `pnpm test:run` currently fails because `tests/nuxt/runtime.test.ts` times out during Nuxt test environment setup after 10 seconds.

## Architecture

The refactor keeps page components as orchestration shells. Shared list behavior moves into composables, repeated modal/detail surfaces move into business components, and table-specific helpers move beside the feature that owns them.

### Dashboard List State

Add a composable such as `useDashboardListState` under `app/composables/dashboard/`.

Responsibilities:

- Hold `filters`, `page`, and `pageSize`.
- Reset filters to explicit defaults.
- Reset the page when filters or page size change.
- Optionally synchronize stable state to the URL query.
- Parse URL query values into strongly typed defaults.
- Avoid automatic fetches on every keystroke unless the caller opts in.

The composable should be generic and interface-driven. It should use named exports, `function` declarations for pure helpers, and no classes or enums.

### Private Paged Lists

Enhance `usePrivatePagedList` without changing its core privacy guarantee:

- Continue using `$fetch` and client-only initial loading for private data.
- Preserve request sequence protection so stale responses do not overwrite newer results.
- Refresh when `pageSize` changes, with page reset to `1`.
- Expose a structured `error` ref so pages can render or toast failures consistently.
- Accept externally managed `page`, `pageSize`, and `filters` when paired with the new list-state composable.

This keeps the existing contract available while allowing migrated pages to share a single source of state.

### Page Decomposition

For the first pages:

- `admin/logs` and `user/logs` should share list-state patterns and detail modal extraction.
- `admin/users/index` should keep its business actions but move page-level table/action helpers out of the page when doing so reduces coupling.
- `user/apikeys` should split create/edit/reset modal details from page orchestration where practical. Shared API key form logic already exists and should be reused.

The page should mainly contain:

- `definePageMeta`
- top-level composable calls
- small event handlers that coordinate feature actions
- dashboard panel/navbar/body structure
- references to extracted components

### URL State

List URL query synchronization should be opt-in per page. The first pass should add it to long-running investigative workflows where refresh/back/share behavior matters:

- Admin call logs
- User call logs

For user/API key management and small client-side admin lists, URL state can be added only where it improves ergonomics without clutter.

Query values must be deterministic and compact:

- Omit empty/default values.
- Use numbers for pagination and IDs.
- Use comma-separated values for multi-select filters.
- Parse invalid values back to safe defaults.

### Modals And Detail Views

Use `useOverlay()` for newly extracted detail modals when their inputs can be passed as explicit props and do not rely on page-level `provide()`. Keep `v-model:open` where the modal is tightly coupled to parent state or already encapsulated enough to avoid churn.

Destructive confirmations must continue to use `useConfirmDialog()`.

### Styling

The refactor should keep the existing Nuxt UI dashboard style:

- `UDashboardPanel`, `UDashboardNavbar`, `UDashboardToolbar`, `DashboardHeaderActions`, and `UserHeaderActions`
- `DashboardDataTable` for tabular data
- `UEmpty` through `DashboardDataTable` for empty states
- Theme tokens such as `text-muted`, `text-highlighted`, `border-default`, and semantic colors
- Mobile-first Tailwind layouts

Avoid introducing new decorative CSS patterns in this pass. When extracting components, preserve the current visual output unless the local structure is clearly inconsistent with `docs/frontend/dashboard.md`.

## Data Flow

For migrated private paged pages:

1. Page creates typed default filters.
2. Page calls `useDashboardListState` with defaults and query codecs.
3. Page passes state into `usePrivatePagedList`.
4. Filter controls update local filter state.
5. `applyFilters()` resets to page `1`, updates URL state when enabled, and refreshes data.
6. Pagination changes refresh data through the shared list composable.
7. Details open through extracted modal/detail components.

## Error Handling

Data-loading errors should be represented in state, not only logged. Pages may use a compact `UAlert` or toast depending on context.

The private list composable should:

- Set `status` to `error`.
- Clear stale items only for the latest failed request.
- Store the caught error in an `error` ref.
- Keep older request errors from overwriting newer successful state.

Action handlers should continue to use `parseFetchError()` for user-facing toast messages.

## Testing

Use TDD for production changes.

Required tests:

- Unit tests for query parsing/serialization helpers.
- Unit tests for `useDashboardListState` reset and page-change behavior.
- Unit tests or focused Nuxt tests for `usePrivatePagedList` page-size refresh behavior and stale response protection where feasible.
- A fix or configuration update for the current Nuxt runtime test setup timeout so `pnpm test:run` can be used as a reliable post-refactor check.

Verification commands:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test:run`

If the Nuxt runtime test remains slow in the local environment, the implementation should at minimum document and configure an explicit timeout rather than leaving a hidden 10-second failure.

## Performance

The refactor should improve runtime and maintenance characteristics without changing user-visible data contracts:

- Keep private data out of SSR payloads.
- Avoid eager data fetching while users type filters.
- Avoid duplicate fetches when page and filters reset together.
- Keep large chart or heavy visual work out of this pass.
- Preserve existing client-only chart behavior.

Future performance work can revisit public pages, chart chunking, image optimization, and Lighthouse/WebPageTest measurement separately.

## Migration Strategy

Work incrementally:

1. Stabilize tests and add shared composable tests.
2. Add the dashboard list-state composable and query helpers.
3. Enhance `usePrivatePagedList` while preserving existing callers.
4. Migrate `admin/logs`.
5. Migrate `user/logs`.
6. Refactor `admin/users/index` only as far as it benefits from shared pagination and component extraction.
7. Refactor `user/apikeys` modal/detail structure without disrupting existing API key form composables.
8. Run lint, typecheck, and tests after each meaningful step.

## Acceptance Criteria

- The selected pages keep their existing user-facing behavior.
- Admin and user call logs can preserve useful filter and pagination state in the URL.
- Page components are smaller and primarily orchestrate composables/components.
- Shared list behavior is covered by tests that fail before implementation and pass after implementation.
- `pnpm lint` passes.
- `pnpm typecheck` passes.
- `pnpm test:run` has a stable outcome, including an explicit fix for the current Nuxt setup timeout.
- No private list data is introduced into SSR payloads.
- No classes or enums are introduced.
- New functions use named exports and TypeScript interfaces where structured data is needed.
