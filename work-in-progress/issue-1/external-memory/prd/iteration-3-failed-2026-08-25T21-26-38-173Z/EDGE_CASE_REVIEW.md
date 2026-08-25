# Edge Case Review — Issue #1, Iteration 3

All findings below were empirically verified against the running `app` during
this review (not just inferred from reading code).

## Boundary Values

| Case | Covered? | Evidence |
|------|----------|----------|
| Exactly `MAX_BULK_ITEMS` (50 items) | ✅ | `src/app.test.js:109-114` |
| `MAX_BULK_ITEMS + 1` (51 items) | ✅ | `src/app.test.js:102-107` |
| `qty = 0` (boundary of the `>0` guard) | ✅ | `src/app.test.js:66-70` (via bulk), covered for `priceWidget` directly too |
| `qty` exactly `100` (discount threshold) | ✅ | `src/app.test.js:9-11`, `52-56` |
| `qty = 99` vs `100` (just under/at threshold) | ⚠️ PARTIAL | `100` is tested; `99` (just-under) is not explicitly tested — only `10` (well under) is used. Low risk since the threshold logic (`qty >= 100`) is a single simple comparison, but a boundary value one unit below the threshold is textbook boundary-testing practice and is missing. |

## Error Scenarios

| Case | Covered? | Evidence |
|------|----------|----------|
| Missing required param (`items`) | ✅ | `src/app.test.js:90-94` |
| Empty string param (`items=`) | ✅ | `src/app.test.js:96-100` |
| Malformed token (non-numeric, missing/extra colon) | ✅ | `src/app.test.js:72-88` |
| Empty token (adjacent/trailing delimiter) | ✅ | `src/app.test.js:117-127` |
| Non-string param (repeated `items=`) | ✅ | `src/app.test.js:131-135` |
| **`NaN`-producing input** (`items=abc:2`) | ✅ | `src/app.test.js:72-76` |
| **`Infinity`-producing input** (e.g. `items=1e400:2`) | ❌ **NOT COVERED — confirmed bug-class gap** | Empirically verified during this review: `GET /price/bulk?items=1e400:2` → `200 {"total":null}` (not the expected `400`). Root cause: `Number("1e400")` evaluates to `Infinity`, which passes both `Number.isNaN(qty)` (false) and `priceWidget`'s `qty <= 0` guard (`Infinity <= 0` is false), so the request "succeeds" — but `JSON.stringify(Infinity)` silently serializes to `null` in the response body. This directly parallels the exact class of bug that Q2/`GAP-DIFF-002`/`GAP-DIFF-005` were designed to close for `NaN` and repeated-param inputs, but the fix's scope (a `typeof`/`Number.isNaN` check) does not extend to non-finite numbers. **Same issue exists on the baseline `GET /price?qty=1e400&unit=2` → `200 {"total":null}`**, confirmed empirically, and is likewise untested. |
| Negative `unit` price (e.g. `items=10:-5`) | ❌ NOT COVERED | Not validated by `priceWidget` (only `qty` is guarded); produces a negative total silently. Consistent with already-accepted baseline `/price` behavior (`PRD.md` §7/§13 Q3 — "no validation exists, assumed acceptable"), so this is *intentional*, not a bug — but the intentional behavior is not asserted by any test, so a future accidental change would go undetected either way. |
| Documented `NaN`-passthrough on `/price` (`PRD.md` §7) | ❌ NOT COVERED | `GET /price?qty=abc&unit=2` → confirmed empirically `200 {"total":null}`, matching the PRD's documented (if undesirable) behavior — but zero test exists to lock this in as a regression guard. |
| Unknown route → `404` | ❌ NOT COVERED | `GET /nonexistent` → confirmed empirically `404` (Express default), correct per FR-7, but unasserted. |

## Permission Edge Cases

**N/A** — service has no authentication/authorization model
(`SECURITY_DESIGN.md`); there is nothing to test here.

## Concurrency

**N/A / low-risk** — the service is stateless with no shared mutable state
across requests (`SYSTEM_ARCHITECTURE.md` §1); each `/price/bulk` request
computes its result entirely from its own local variables. No race-condition
test is warranted for this implementation shape.

## Empty States

| Case | Covered? | Evidence |
|------|----------|----------|
| Empty `items` string | ✅ | `src/app.test.js:96-100` |
| Missing `items` param entirely | ✅ | `src/app.test.js:90-94` |

## Large Inputs

| Case | Covered? | Evidence |
|------|----------|----------|
| At-cap item count (50) | ✅ | `src/app.test.js:109-114` |
| Over-cap item count (51) | ✅ | `src/app.test.js:102-107` |
| Very large individual numeric token (overflow → `Infinity`) | ❌ NOT COVERED | See "Error Scenarios" above — this is the most actionable finding in this review. |
| Very long single token string (e.g. hundreds of digits, still finite) | ❌ NOT COVERED | Low priority — `Number()` handles arbitrarily long finite numeric strings without special-casing; no evidence of a distinct failure mode beyond the already-identified `Infinity` case. |

## Priority Summary

1. **HIGH** — `Infinity`/non-finite numeric input silently returns
   `200 {total:null}` on both `/price` and `/price/bulk` instead of `400`.
   This is the single most concrete, actionable finding of this review: it is
   a real (if edge-case) correctness bug adjacent to already-fixed,
   already-tested code (the `NaN` guard), it is trivial to fix and trivial to
   test, and it silently produces a misleadingly "successful" response rather
   than failing loudly.
2. **MEDIUM** — PRD-documented `/price` `NaN`→`null` passthrough behavior has
   no regression test.
3. **LOW** — FR-7 (404 on unknown route) untested; `qty=99` boundary-adjacent
   value untested; negative-`unit` intentional-but-unasserted behavior.

Copy-pasteable test templates for all of the above are in
`ITERATION-4-GUIDANCE.md`.
