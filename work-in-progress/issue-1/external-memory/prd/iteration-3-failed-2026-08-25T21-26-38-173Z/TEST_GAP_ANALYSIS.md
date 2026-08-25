# Test Gap Analysis — Issue #1, Iteration 3

Traceability matrix: every functional requirement from `docs/requirements/PRD.md`
(baseline, FR-1..7) and `docs/design/TDD.md` §D3 (bulk delta, FR-BULK-1..6 /
Q1–Q6) mapped to its corresponding test(s) in `src/app.test.js`.

## Baseline Requirements (PRD.md §7)

| Req ID | Requirement | Test(s) | Status |
|--------|-------------|---------|--------|
| FR-1 | Pricing formula: `qty × unit × (1−discount)`, rounded to 2dp | `src/app.test.js:6-8` (`priceWidget(10,2)===20`), `:144-148` (`/price` regression) | ✅ COVERED |
| FR-2 | 10% discount at `qty ≥ 100` | `src/app.test.js:9-11`, `:144-148` | ✅ COVERED |
| FR-3 | Quantity guard: `qty ≤ 0` → throw / `400` | `src/app.test.js:12-14` (throws, message NOT asserted), `:150-154` (`/price` 400, message asserted) | ⚠️ PARTIAL — unit-test at line 13 only asserts `assert.throws(...)`, not the message; HTTP-level test at 150-154 does assert the message. Net: acceptably covered, but the unit test alone is weak. |
| FR-4 | Parameter parsing via `Number(...)` | Implicit in all `/price` and `/price/bulk` tests | ✅ COVERED (implicitly) |
| FR-5 | `GET /health` → `200 {ok:true}` | `src/app.test.js:138-142` | ✅ COVERED |
| FR-6 | JSON response format | Implicit — every test parses `res.json()` and asserts the body shape | ✅ COVERED (implicitly) |
| FR-7 | Unknown routes → Express default `404` | **none** | ❌ **NOT COVERED** — no test in `src/app.test.js` requests an undefined route. Empirically verified during this review: `GET /nonexistent` → `404` (correct behavior), but it is asserted nowhere in the suite. |
| (documented, PRD §7) | `NaN` qty/unit on `/price` → `200 {total:null}` (explicitly documented, not-yet-fixed known behavior) | **none** | ❌ **NOT COVERED** — `PRD.md` §7 explicitly calls this out as a documented current behavior, yet no test in `src/app.test.js` asserts `GET /price?qty=abc&unit=2` (or missing params) returns `200 {"total":null}`. If this behavior is ever accidentally "fixed" (e.g. an incidental refactor starts throwing), there is no regression test to catch the change either way. |

## Bulk-Pricing Requirements (TDD.md §D3, PRD_DELTA_issue-1.md §6)

| Req ID | Requirement | Test(s) | Status |
|--------|-------------|---------|--------|
| FR-BULK-1 | `GET /price/bulk?items=qty:unit,…` registered | `src/app.test.js:40-56` and all bulk tests | ✅ COVERED |
| FR-BULK-2 | Per-line pricing via existing `priceWidget`, discount per line not on aggregate | `:52-56` (`bulk: applies per-line discount within one request`) | ✅ COVERED |
| FR-BULK-3 | Comma/colon parsing, `Number()` coercion | `:40-63` and error-path tests | ✅ COVERED |
| FR-BULK-4 | Invalid line → whole request `400` | `:66-88` (non-positive qty, non-numeric, missing/extra colon) | ✅ COVERED |
| FR-BULK-5 | Success envelope `{total:<number>}` | All success tests | ✅ COVERED |
| FR-BULK-6 | Automated tests required | This entire file | ✅ COVERED (trivially, by definition) |
| Q1 (envelope) | `{total}` only, no per-line breakdown | Implicit in all success-path `deepStrictEqual` assertions (no extra keys) | ✅ COVERED |
| Q2 (invalid line / NaN) | All-or-nothing `400`; `NaN` explicitly rejected | `:66-88`; **but see EDGE_CASE_REVIEW.md** — `Infinity` (a non-NaN, non-finite numeric value) is NOT rejected, contrary to the spirit of Q2's "reject invalid numeric input" intent. | ⚠️ PARTIAL — `NaN` is covered; the adjacent `Infinity` case is not, and empirically returns `200 {total:null}` instead of `400`. |
| Q3 (max items = 50) | Cap enforced, `400` over cap | `:102-114` (51 rejected, exactly-50 accepted) | ✅ COVERED — good boundary-value testing |
| Q4 (empty/missing items) | `400 "items is required"` | `:90-100` | ✅ COVERED |
| Q5 (delimiters `,` / `:`) | Exactly one `:` per token | `:78-88` (missing colon, extra colon) | ✅ COVERED |
| Q6 (rounding) | Sum per-line rounded outputs, final round | `:58-63` (float-precision test, `0.1+0.2` case) | ✅ COVERED — this is a genuinely good test that specifically targets a float-accumulation bug class. |

## Summary

- **13 of 14 explicit requirement rows fully covered**, 2 partially covered
  (FR-3 unit-test message assertion, Q2's `NaN`-but-not-`Infinity` scope), 2
  not covered at all (FR-7 unknown-route 404, PRD §7's documented `/price`
  `NaN`-passthrough behavior).
- **0 CRITICAL** (no requirement is entirely silent on a security- or
  correctness-load-bearing path).
- **1 HIGH**: the `Infinity` gap (Q2 scope) — see `EDGE_CASE_REVIEW.md` for
  the full analysis; it produces a silently-wrong `200 {total:null}` response
  instead of the `400` that the adjacent, explicitly-tested `NaN` case
  correctly produces.
- **3 MEDIUM/LOW**: FR-7 (404) untested, PRD §7 NaN-passthrough untested,
  FR-3 unit-test message not asserted.

Full remediation templates for each of these are in
`ITERATION-4-GUIDANCE.md`.
