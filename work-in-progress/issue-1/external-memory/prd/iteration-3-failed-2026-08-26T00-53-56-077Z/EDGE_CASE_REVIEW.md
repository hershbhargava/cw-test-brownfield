# Edge Case Review — Iteration 3

Static review of `src/app.test.js` against `src/app.js` behavior. No execution data used.

## Boundary values

| Case | Covered? | Evidence |
|---|---|---|
| Exactly at discount threshold (`qty=100`) | ✅ | `src/app.test.js:9-11` (unit), `52-56` (bulk) |
| Just below threshold (`qty=99`) | ✅ | `src/app.test.js:193-197` |
| `qty=0` (guard boundary) | ✅ | `src/app.test.js:12-14`, `66-70` |
| Exactly 50 items (cap boundary, inclusive) | ✅ | `src/app.test.js:109-114` |
| 51 items (cap boundary, exclusive) | ✅ | `src/app.test.js:102-107` |
| Negative `qty` | ⚠️ Partial | Only `qty<=0` guard tested via `0`; no explicit negative-`qty` case (e.g. `-5:2`) distinct from the zero case — same code path (`qty <= 0`) so risk is low, but untested literally. |
| Negative `unit` | ✅ (bulk only) | `src/app.test.js:201-205`; no `/price` single-item equivalent (see TEST_GAP_ANALYSIS #3) |
| `Infinity`/non-finite qty & unit | ✅ | `src/app.test.js:159-169` (both endpoints) |

## Error scenarios

| Case | Covered? | Evidence |
|---|---|---|
| Missing required param (`items`) | ✅ | `src/app.test.js:90-94` |
| Empty string param (`items=`) | ✅ | `src/app.test.js:96-100` |
| Malformed token (non-numeric) | ✅ | `src/app.test.js:72-76` |
| Malformed token (missing delimiter) | ✅ | `src/app.test.js:78-82` |
| Malformed token (too many delimiters) | ✅ | `src/app.test.js:84-88` |
| Adjacent delimiters → empty token | ✅ | `src/app.test.js:117-121` |
| Trailing delimiter → empty token | ✅ | `src/app.test.js:123-127` |
| Non-string param (repeated → array) | ✅ | `src/app.test.js:131-135` |
| `NaN` handling divergence (`/price` passthrough vs `/price/bulk` reject) | ✅ | `src/app.test.js:180-184` vs `72-76` |
| Unknown route | ✅ | `src/app.test.js:187-190` |

## Permission edge cases

**N/A** — service has no auth/authorization model (`docs/design/technical/SECURITY_DESIGN.md`,
confirmed by `TDD.md` §6 "Auth/Security: none"). No gap; this is a documented absence,
not an untested requirement.

## Concurrency

| Case | Covered? | Notes |
|---|---|---|
| Concurrent/parallel requests to `/price/bulk` | ❌ Not tested | Service is stateless (no shared mutable state per `TDD.md` §7), so race conditions are unlikely by design, but no test demonstrates concurrent-safety explicitly. Low priority given statelessness. |
| Duplicate/idempotent submissions | N/A | All endpoints are `GET`/read-only; no mutation, so classic duplicate-submission risk does not apply. |

## Empty states

| Case | Covered? | Evidence |
|---|---|---|
| Empty `items` string | ✅ | `src/app.test.js:96-100` |
| Empty token between delimiters | ✅ | `src/app.test.js:117-127` |
| Zero-length line-item list (0 tokens) | Effectively covered by empty-string case above (raw `""` short-circuits before split) | — |

## Large inputs

| Case | Covered? | Notes |
|---|---|---|
| Item-count cap (50/51) | ✅ | `src/app.test.js:102-114` |
| **Long individual token / oversized numeric string** | ❌ Not tested | The 50-item cap bounds *item count* but not *string length per token*. A single token like `items=999999999999999999999999999999:2` (huge digit string) is only implicitly guarded by `Number.isFinite` after parsing — no test confirms very large (but finite) numeric strings behave sanely, nor is there a cap on overall `items` string length/token length. This is the one **unbounded-input surface** flagged as a risk in `TDD.md` §D7/D10 ("50-item cap... mitigating a trivial amplification/DoS vector") that isn't fully closed by a test — the cap addresses item *count*, not per-token *string size*. |
| Very long `qty:unit` decimal precision | ❌ Not tested | e.g. `items=1.123456789123456789:2` — coercion/rounding behavior at extreme precision is unverified. |

## Summary of missing edge cases (priority order)

1. **MEDIUM** — Oversized single-token numeric string (item-count cap doesn't bound
   per-token length; `TDD.md` D7 calls out unbounded input as the only new attack
   surface, but the mitigation described — the 50-item cap — doesn't fully cover this
   sub-case).
2. **LOW** — Explicit negative `qty` (distinct literal from `0`) on both endpoints.
3. **LOW** — Negative/zero `unit` on `/price` (single-item), mirroring the bulk test at
   `src/app.test.js:201-205`.
4. **LOW** — Non-`GET` verb rejection (see TEST_GAP_ANALYSIS #1).
5. **LOW** — Concurrent-request smoke test (low risk given statelessness, but currently
   zero evidence).
