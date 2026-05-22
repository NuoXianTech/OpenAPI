# API Charging

This document describes the single-instance production charging flow for public
APIs under `server/routes/v{N}/**`.

## Data Model

- `users.credits` is the single source of truth for user balance.
- `apis.method_costs` stores per-method prices as `Record<UPPER_METHOD, number>`.
- `credit_transactions` stores every balance change with a `balanceAfter` audit snapshot.
- `pending_charges` stores failed after-response charges for retry in the same Node process.
- There is no package, subscription, payment gateway, or monthly allowance system yet.

## Request Flow

1. `server/middleware/00.api-gate.ts` resolves `(pathVersion, code)`, loads the API config, matches the endpoint, and computes the effective method cost.
2. `runApiGuard` checks API status, API Key rules, in-memory rate limits, daily quota, and user balance.
3. The public API handler runs and returns the standard OpenAPI response shape.
4. `server/plugins/apiCallStats.ts` records `api_calls` and updates `api_call_stats` after the response is sent.
5. If the call should be charged, `creditService.charge` atomically decrements `users.credits` and inserts `credit_transactions`.
6. If charging fails after the response has already been sent, `pendingChargeService.enqueue` writes one retry row keyed by `apiCallId`.
7. `server/plugins/pendingChargesRetry.ts` scans due `pending_charges` rows every 30 seconds in the single Node process, retries the charge, and either deletes the row on success or backs off until it becomes `dead_letter`.

## Reliability Rules

- Do not charge inside API handlers. Handlers should only return success/failure; the plugin owns charging.
- Do not update `users.credits` directly. All balance changes must go through `creditService` or an equivalent single transaction that also writes an audit row.
- `credit_transactions(apiCallId, reason)` remains unique when `apiCallId` is present, preventing duplicate charge/refund rows for one API call.
- `pending_charges.apiCallId` remains unique, preventing duplicate retry queue rows.
- `pending_charges.status` is limited to `pending` and `dead_letter`.

## Rate Limiting

Rate limiting is intentionally in-process memory only. This project is designed
for a single production Node server process. Counters reset when the process
restarts, which is acceptable for this deployment model.

## Known Gaps

- `creditService.refund` exists for future flows but is not currently called by the standard API charging pipeline.
- `signup_bonus` is a reserved credit reason and is not currently written during registration.
- `dead_letter` pending charges currently require operational handling; a dedicated admin page would be a useful follow-up.
