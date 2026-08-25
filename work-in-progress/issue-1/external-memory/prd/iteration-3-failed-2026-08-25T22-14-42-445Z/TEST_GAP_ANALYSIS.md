# Test Gap Analysis — Issue #1, Iteration 3 (post-fix)

## Requirement → Test Traceability Matrix

Source: TDD.md §D3 (Q1–Q6 decisions), §D9 (testing strategy), §9 (baseline
observations); PRD.md/PRD_DELTA (issue #1 acceptance criteria).

| Req | Requirement | Test(s) in `src/app.test.js` | Status |
|---|---|---|---|
| R1 | Sum discounted totals across line items | `bulk: sums discounted totals across line items` | ✅ COVERED |
| R2 | Single line item | `bulk: single line item` | ✅ COVERED |
| R3 (Q1) | Per-line discount applied within one bulk call | `bulk: applies per-line discount within one request` | ✅ COVERED |
| R4 (D6) | Final sum rounded to 2 decimals (fp artifacts) | `bulk: final rounding to 2 decimals` | ✅ COVERED |
| R5 (Q2) | Invalid line (qty≤0) → all-or-nothing 400 | `bulk: rejects a line with non-positive qty` | ✅ COVERED |
| R6 (Q2) | Malformed / non-numeric token → 400 | `bulk: rejects malformed token (non-numeric)` | ✅ COVERED |
| R7 (Q5) | Token missing `:` → 400 | `bulk: rejects token missing the colon` | ✅ COVERED |
| R8 (Q5) | Token with too many `:` → 400 | `bulk: rejects token with too many colons` | ✅ COVERED |
| R9 (Q4) | Missing `items` → 400 | `bulk: rejects missing items param` | ✅ COVERED |
| R10 (Q4) | Empty `items` → 400 | `bulk: rejects empty items param` | ✅ COVERED |
| R11 (Q3) | >50 items → 400 | `bulk: rejects more than 50 items` | ✅ COVERED |
| R12 (Q3) | Exactly 50 items (boundary) → 200 | `bulk: accepts exactly 50 items (boundary)` | ✅ COVERED |
| R13 (GAP-DIFF-004) | Adjacent delimiters (empty token) → 400 | `bulk: rejects adjacent delimiters` | ✅ COVERED |
| R14 (GAP-DIFF-004) | Trailing delimiter (empty token) → 400 | `bulk: rejects trailing delimiter` | ✅ COVERED |
| R15 (GAP-DIFF-002) | Non-string `items` (repeated param/array) → 400, no leaked runtime error | `bulk: rejects repeated items param (non-string)` | ✅ COVERED |
| R16 | `/health` unaffected | `regression: /health still returns ok` | ✅ COVERED |
| R17 | `/price` totals/discount unaffected | `regression: /price still computes discounted total` | ✅ COVERED |
| R18 | `/price` non-positive-qty rejection unaffected | `regression: /price still rejects non-positive qty` | ✅ COVERED |
| R19 | `priceWidget` baseline behavior (no-discount, discount, throw) | 3 baseline unit tests | ✅ COVERED |
| R20 (fix) | Infinity-producing qty/unit token → 400 on `/price/bulk` | `bulk: rejects non-finite (Infinity) qty/unit token` (×2) | ✅ COVERED |
| R21 (fix) | Infinity-producing qty → 400 on `/price` | `price: rejects non-finite (Infinity) qty` | ✅ COVERED |
| R22 (fix) | `/price` NaN → `{total:null},200` legacy passthrough preserved | `price: NaN qty still passes through...` | ✅ COVERED |
| R23 (TDD §5/baseline) | Unknown route → 404 (FR-7, was previously untested) | `regression: unknown route returns 404` | ✅ COVERED |
| R24 | qty just below discount threshold (99) → no discount | `bulk: qty=99 gets no discount` | ✅ COVERED |
| R25 (TDD §9.2) | Negative `unit` accepted, unvalidated (documented behavior) | `bulk: negative unit price yields negative total` | ✅ COVERED |

**Result: 25/25 identified requirements have at least one covering test.**
This closes all 6 gaps (1 HIGH, 1 MEDIUM, 4 LOW) raised in the prior QA
review (`d227c9d`, 72/100 REVIEW_AGAIN).

## Remaining gaps (new findings, this review)

These are edge cases not called for by any TDD/PRD requirement, but are
reachable through the shipped `Number()`-based parsing and are currently
unasserted. All are LOW severity — none reproduce incorrect totals or
security-relevant behavior; they are undocumented-input-coercion gaps.

| ID | Severity | Description | Reachable via |
|---|---|---|---|
| GAP-N1 | LOW | Negative `qty` (not just `qty=0`) is never explicitly asserted — only the `qty<=0` boundary at exactly `0` is tested, on both `/price` and `/price/bulk`. Code path (`qty <= 0` throw) is shared with the zero case, so risk is low, but the specific negative branch has no direct assertion. | `GET /price/bulk?items=-5:2`, `GET /price?qty=-5&unit=2` |
| GAP-N2 | LOW | `Number()` accepts hex/octal/binary numeric-string literals (e.g. `Number("0x10") === 16`). A token like `0x10:2` is silently treated as a valid, non-obvious numeric value rather than rejected as malformed — untested, undocumented. | `GET /price/bulk?items=0x10:2` |
| GAP-N3 | LOW | `Number()` trims/accepts leading/trailing whitespace (e.g. `Number(" 10 ") === 10`). A token like ` 10 : 2 ` silently succeeds rather than being rejected as malformed — untested, undocumented. | `GET /price/bulk?items= 10 : 2 ` |

None of these are blockers; they are recorded for completeness in
`ITERATION-4-GUIDANCE.md` as optional strengthening tests, not required
fixes.

## Gaps closed since prior iteration

| Prior Gap (from `d227c9d`) | Severity | Resolution this iteration |
|---|---|---|
| Infinity bypasses NaN guard on both endpoints | HIGH | Fixed (`2257de0`) + tested (R20, R21) |
| `/price` NaN passthrough untested | MEDIUM | Tested (R22) |
| Unknown-route 404 untested | LOW | Tested (R23) |
| `qty=99` boundary untested | LOW | Tested (R24) |
| Negative unit price behavior unasserted | LOW | Tested (R25) |
| Non-positive-qty test didn't assert message | LOW | Strengthened with `{ message: 'qty must be positive' }` matcher |
