# Test Gap Analysis — Iteration 3

**Repository:** hershbhargava/cw-test-brownfield
**Issue:** #1
**Authoritative baseline:** 38/38 tests passing, 100% pass rate (`metadata.json`, `TEST_EXECUTION_REPORT.md`).

This document lists concrete, file/line-referenced gaps between the requirements in `docs/design/TDD.md` §D3/§D9, `docs/requirements/PRD_DELTA_issue-1.md` §6/§8, and the actual test suite `src/app.test.js`. Traceability matrix first, then gap detail.

## Requirement Traceability Matrix

| Req ID | Requirement (PRD_DELTA §6 / TDD §D3) | Covered by test(s) | Status |
|---|---|---|---|
| FR-BULK-1 | Sum discounted totals across line items | `bulk: sums discounted totals across line items` (L40-44), `bulk: single line item` (L46-50) | ✅ Covered |
| FR-BULK-2 | Per-line discount applies independently (qty≥100 rule) | `bulk: applies per-line discount within one request` (L52-56), `bulk: qty=99 gets no discount` (L193-197) | ✅ Covered |
| FR-BULK-3 | Reuse `priceWidget` exactly (no divergent logic) | Implicit via L57 (`total += priceWidget(...)`) + all bulk success tests | ✅ Covered |
| FR-BULK-4 | All-or-nothing validation (any bad line rejects whole request) | `rejects a line with non-positive qty` (L66), `rejects malformed token` (L72), `rejects token missing colon` (L78), `rejects token with too many colons` (L84), `rejects a line with negative qty` (L247) | ✅ Covered |
| FR-BULK-5 | Item-count cap (`MAX_BULK_ITEMS=50`) | `rejects more than 50 items` (L102), `accepts exactly 50 items (boundary)` (L109) | ✅ Covered (both sides of boundary) |
| FR-BULK-6 | Final total rounded to 2 decimals | `bulk: final rounding to 2 decimals` (L58-63) | ✅ Covered (classic float-precision case: 0.1+0.2) |
| TDD Q1 | Missing/empty `items` param → 400 | `rejects missing items param` (L90), `rejects empty items param` (L96) | ✅ Covered |
| TDD Q2 | Non-finite per-token input rejected (stricter than `/price`) | `rejects non-finite (Infinity) qty/unit token` (L159, L165), oversized-digit-string variants (L230, L237) | ✅ Covered |
| TDD Q3 | Non-string `items` (repeated param) rejected cleanly | `rejects repeated items param (non-string)` (L131) | ✅ Covered |
| — | **Aggregate/sum-level overflow after N individually-valid items** | **None** | ❌ **GAP — see below** |

## Gap 1 (HIGH, carried forward): No test for aggregate sum overflow

**Requirement gap, not just a test gap.** Neither the TDD nor the PRD delta explicitly enumerates "the running sum itself must stay finite" as a requirement — but the code comment at `src/app.js:51-53` states the per-token guard exists specifically so "the bulk sum can never be a nonsensical null/Infinity," which is a claim the code does not actually fulfill for the 50-item aggregate case. This is simultaneously:
- a **spec gap** (TDD §D3/Q2 should be extended to state the invariant explicitly), and
- a **test gap** (no test asserts the invariant, so the false claim in the code comment went unnoticed).

Reproduction (re-verified in this pass):
```
GET /price/bulk?items=1e307:1,1e307:1,...(×50)
→ 200 {"total":null}
```
Each `1e307:1` line is individually finite and passes the L54 guard; `priceWidget(1e307,1)` returns `1e307` (well under the qty≥100 discount is irrelevant here since qty=1e307≥100 triggers 10% discount, still finite `9e306`); summing 50× `9e306` = `4.5e308` > `Number.MAX_VALUE` (`≈1.7976931348623157e308`) → `Infinity`. `+total.toFixed(2)` on `Infinity` → `Infinity`, and `res.json({ total: Infinity })` serializes `Infinity` as JSON `null` (per `JSON.stringify` spec behavior, silently, no error).

**Impact:** a client receives `HTTP 200 {"total": null}` for a bulk-pricing request — indistinguishable from a successful $0/null-value quote unless the client specifically checks for `null`. This directly contradicts the "all-or-nothing, reject invalid" design intent stated in the FR-BULK-4 all-or-nothing philosophy and the code's own inline justification comment.

**Fix + test template:** see `ITERATION-4-GUIDANCE.md` (unchanged from previous iteration, still valid, not yet applied).

## Gap 2 (LOW, informational): No direct unit test for `MAX_BULK_ITEMS` constant boundary via `priceWidget` reuse under discount at exactly 50 items

The 50-item boundary test (`accepts exactly 50 items (boundary)`, L109-114) uses `1:1` for all 50 items (qty=1, well below the qty≥100 discount threshold), asserting `total: 50`. This confirms the count boundary works, but does not confirm the interaction between "exactly 50 items" and "discount applied on some/all of them" (e.g., 50 items each at qty=100 → discount + max-count simultaneously). This is a minor combinatorial gap; low risk since discount logic (`priceWidget` line 16) and the count cap (line 41) are independent, orthogonal branches with no shared state, but a combined test would fully close the interaction-testing matrix.

## Gap 3 (LOW, informational): No test asserts `Content-Type: application/json` response header

All tests assert on parsed JSON body and status code only. Express's `res.json()` sets `Content-Type: application/json; charset=utf-8` automatically and this is extremely unlikely to regress, but no test pins the contract at the header level. Not blocking; noted for completeness per "file/line-level, not generic" review standard.

## Non-gaps (explicitly verified as already covered, listed to avoid duplicate guidance in future iterations)

- Empty-token via adjacent/trailing delimiters — covered (L117, L123).
- Non-GET verbs on both routes — covered via loop (L212-222), 6 distinct assertions.
- `/price` legacy NaN passthrough not broken by the Infinity fix — covered (L180).
- Unknown-route 404 — covered (L187).
- Negative unit price (documented, unvalidated) on both `/price` and `/price/bulk` — covered (L201, L256).
