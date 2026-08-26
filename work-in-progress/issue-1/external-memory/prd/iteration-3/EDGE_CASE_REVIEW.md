# Edge Case Review — Issue #1, QA Review Iteration 3

## Boundary values

| Case | Covered? | Test |
|---|---|---|
| `qty` exactly at discount threshold (100) | ✅ | `src/app.test.js:9` (unit), `:52` (bulk) |
| `qty` just below threshold (99) | ✅ | `:193` |
| `qty` exactly 0 | ✅ | `:12` (unit), `:150` (`/price`), `:66` (bulk) |
| `qty` negative (distinct from zero) | ✅ | `:247` (bulk, new this iteration), `:150`/`:66` cover only zero for the route level — negative confirmed equivalent via `priceWidget`'s single `<= 0` guard |
| Item count exactly at cap (50) | ✅ | `:109` |
| Item count over cap (51) | ✅ | `:102` |
| Numeric overflow, single token (`1e400`) | ✅ | `:159,165` |
| Numeric overflow, single token (400-digit string) | ✅ | `:230,237` (new this iteration) |
| **Numeric overflow, aggregate sum of finite per-line values** | ❌ **NOT COVERED — HIGH finding, see `TEST_GAP_ANALYSIS.md`** | — |

## Error scenarios

| Case | Covered? | Test |
|---|---|---|
| Missing required param (`items`) | ✅ | `:90` |
| Empty param (`items=`) | ✅ | `:96` |
| Malformed token, non-numeric (`abc:2`) | ✅ | `:72` |
| Malformed token, missing delimiter (`10`) | ✅ | `:78` |
| Malformed token, extra delimiter (`10:2:3`) | ✅ | `:84` |
| Malformed token, empty via adjacent delimiter (`10:2,,100:2`) | ✅ | `:117` |
| Malformed token, empty via trailing delimiter (`10:2,`) | ✅ | `:123` |
| Non-string param (repeated `items=` → array) | ✅ | `:131` |
| Invalid business rule (`qty <= 0`) | ✅ | `:66` (zero), `:247` (negative) |
| Non-finite input (`Infinity`), both forms, both fields | ✅ | `:159,165,171,230,237` |
| Non-GET verb on a known GET-only path | ✅ | `:212-222` (new this iteration — POST/PUT/DELETE × `/price`, `/price/bulk`) |
| Unknown route entirely | ✅ | `:187` |

## Documented-quirk / intentional-divergence cases

These aren't "bugs to fix" — they're existing, documented behaviors the tests
correctly **pin** rather than "fix silently":

| Case | Covered? | Test |
|---|---|---|
| `/price` NaN passthrough → `200 {total:null}` (legacy, documented) | ✅ | `:180` |
| `/price/bulk` NaN → explicit `400` (deliberate divergence from `/price`) | ✅ | `:72` |
| Negative `unit` accepted (unvalidated) on `/price`, negative total | ✅ | `:256` (new this iteration) |
| Negative `unit` accepted (unvalidated) on `/price/bulk`, negative total | ✅ | `:201` |

This pairing (`/price` vs `/price/bulk` on the same behavior) is a good practice —
it makes the *intentional* contract divergence between the two routes explicit and
regression-proof, rather than leaving a reader to wonder if it's an oversight.

## Empty states

| Case | Covered? | Test |
|---|---|---|
| Empty `items` string | ✅ | `:96` |
| Empty token between delimiters | ✅ | `:117,123` |

## Large inputs

| Case | Covered? | Test |
|---|---|---|
| Item count at/over the 50-item cap | ✅ | `:102,109` |
| Oversized single numeric token (length-based overflow) | ✅ | `:230,237` |
| **Many large-but-individually-valid items causing sum overflow** | ❌ **NOT COVERED — see HIGH finding** | — |

## Concurrency / permissions

**N/A.** The service is stateless with no shared mutable state, no auth, and no
persistence (`TDD.md` §7, §9; `PRD.md` §8). There is no concurrency or permission
surface for `/price/bulk` to test — confirmed by reading `src/app.js` (no
module-level mutable state, no locks, no shared resources across requests).

## Summary

Edge-case coverage is comprehensive across boundary values, error scenarios, and
documented-quirk pinning — including all four gaps closed in this dev iteration
(non-GET verbs, oversized token, negative qty/unit). The single remaining gap is the
**aggregate sum-overflow** case (HIGH), which is a genuinely new finding from this
review, not a repeat of any prior iteration's guidance. See `TEST_GAP_ANALYSIS.md`
for the full technical detail and `ITERATION-4-GUIDANCE.md` for a ready-to-use test
template plus the suggested code fix.
