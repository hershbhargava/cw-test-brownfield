# Test Gap Analysis — Issue #1, QA Review Iteration 3

Traceability matrix built by reading `docs/requirements/PRD_DELTA_issue-1.md`,
`docs/design/TDD.md` (Architecture Delta §D1–D11), `docs/design/technical/
API_CONTRACTS.md`, and `src/app.test.js` directly (no metrics/counts used — see
`TEST_QUALITY_REPORT.md` provenance notice).

## Requirement → Test matrix (`PRD_DELTA_issue-1.md` §6)

| Requirement | Description | Test(s) | Status |
|---|---|---|---|
| FR-BULK-1 | Bulk endpoint returns summed discounted total | `src/app.test.js:40` (`bulk: sums discounted totals across line items`), `:46` (single line) | ✅ COVERED |
| FR-BULK-2 | Per-line discount (10% at qty≥100), applied per line not aggregate | `:52` (`bulk: applies per-line discount within one request`), `:193` (`qty=99 gets no discount`) | ✅ COVERED |
| FR-BULK-3 | Input parsing: comma-separated `qty:unit` tokens | `:72,78,84,117,123` (malformed token variants) | ✅ COVERED |
| FR-BULK-4 | Invalid line → 400 with error message | `:66` (qty=0), `:247` (qty=-5, distinct from zero), `:72,78,84` (malformed) | ✅ COVERED |
| FR-BULK-5 | Response envelope `{ total }`, rounded to 2dp | `:58` (`0.1+0.2` float-rounding case) | ✅ COVERED |
| FR-BULK-6 | Automated tests exist | N/A (met by the presence of this suite) | ✅ COVERED |

## Open-question decisions → Test matrix (`TDD.md` §D3, Q1–Q6)

| ID | Decision | Test(s) | Status |
|---|---|---|---|
| Q1 | Envelope: `{ total }`, no per-line breakdown | Implicit in all success-path tests (body shape asserted via `deepStrictEqual`) | ✅ COVERED |
| Q2 | Reject whole request on invalid line; **NaN explicitly rejected** (stricter than `/price`) | `:72` (`abc:2` → 400), `:180` (`/price` NaN still passes through as documented — contrast test proves the *deliberate divergence*, not an oversight) | ✅ COVERED |
| Q3 | Max 50 items | `:102` (51 → 400), `:109` (exactly 50 → 200, boundary) | ✅ COVERED |
| Q4 | Missing/empty `items` → 400 | `:90` (missing), `:96` (empty) | ✅ COVERED |
| Q5 | Delimiters `,` / `:`, one colon per token | `:78` (missing colon), `:84` (two colons), `:117,123` (adjacent/trailing empty token) | ✅ COVERED |
| Q6 | Round once at the end (`+(sum).toFixed(2)`) | `:58` | ✅ COVERED |

## Prior QA-review gaps (this iteration's mandate) → Test matrix

| Severity | Gap (from prior review) | Test(s) added this iteration | Status |
|---|---|---|---|
| HIGH | Non-GET verbs on `/price`, `/price/bulk` not asserted to 404 | `:212-222` (POST/PUT/DELETE × both routes, 6 tests via loop) | ✅ CLOSED |
| MEDIUM | Oversized single numeric token (long digit string, distinct from `1e400` literal) | `:230-242` (400-digit qty and unit tokens) | ✅ CLOSED |
| LOW | Negative qty (bulk, distinct from zero) | `:247-251` (`items=-5:10`) | ✅ CLOSED |
| LOW | Negative unit (`/price`, single-item) | `:256-260` (`/price?qty=10&unit=-3` → `200 {total:-30}`) | ✅ CLOSED |

All four previously-identified gaps are closed with tests that were independently
verified against actual `src/app.js` runtime behavior during this review (re-derived
expected values by reading the guard logic at `src/app.js:10-17,54` — assertions
match).

## ⛔ New gap found during this review (not previously flagged)

### HIGH — Aggregate/sum-level numeric overflow is untested and reproduces the exact bug the per-token guard was built to prevent

**What's missing**: every existing overflow test (`1e400` literal, 400-digit string)
checks that a **single token** producing `Infinity` is rejected before it reaches
`priceWidget`. No test exercises the case where **each individual line item is
finite and valid**, but the **running sum across multiple lines** overflows to
`Infinity`.

**Verified reproduction** (executed directly against `src/app.js` during this
review, not sourced from any prior metadata):
```
GET /price/bulk?items=1e307:1,1e307:1,...(×50, the max allowed by MAX_BULK_ITEMS)
→ 200 { "total": null }
```
Each line (`priceWidget(1e307, 1)` = `9e306`) is individually finite and passes the
per-token guard at `src/app.js:54`. Summing 50 of them (`total += priceWidget(...)`,
`src/app.js:57`) overflows past `Number.MAX_VALUE` (≈1.7976931348623157e308) to
`Infinity`. `+total.toFixed(2)` (`src/app.js:59`) is `Infinity`, and
`JSON.stringify({ total: Infinity })` serializes to `{"total":null}` — with
**HTTP 200**, not 400.

**Why this matters**: this is precisely the "nonsensical aggregate `total: null`
with a `200`" outcome that `TDD.md` §D3/Q2 states the NaN/Infinity rejection design
exists to prevent ("Rejecting `NaN` prevents an aggregate `total` of `null`, which
would be a nonsensical bulk result"). The per-token `Number.isFinite` guard at
`src/app.js:54` checks each token in isolation but there is **no guard on the
running/final sum** (`src/app.js:57,59`) — so the exact failure mode the design
intended to eliminate is still reachable, just via summation instead of a single
malformed token. It requires no exotic input — plain, individually-valid large
numeric literals within the documented 50-item cap.

**Recommendation**: add `Number.isFinite(total)` check after the accumulation loop
(or after each `total +=`) in `src/app.js`, returning
`400 { "error": "total is too large" }` (or similar), and add a regression test.
See `ITERATION-4-GUIDANCE.md` for a copy-pasteable test template.

## Minor / LOW nice-to-have gaps (not blocking, informational)

| Gap | Note |
|---|---|
| Numeric string coercion quirks (e.g. `Number("0x64")` = `100`, hex parses silently) | Shared `Number(...)` coercion behavior with `/price` (not introduced by bulk); no test documents it for `/price/bulk` specifically. |
| Fractional `qty` (e.g. `items=1.5:2`) | Not explicitly asserted; `priceWidget` places no integer constraint, so behavior is well-defined, just undocumented by a test. |
| Whitespace-padded tokens (e.g. `items=%2010%20:2`) | `Number(" 10 ")` trims and parses fine; not a bug, just untested. |

These are **not** blockers for this iteration's verdict; listed for completeness per
Phase 5 (Edge Case Analysis) — see `EDGE_CASE_REVIEW.md`.
