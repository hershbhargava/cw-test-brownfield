# Test Gap Analysis — Iteration 3

**Method**: static traceability match between requirements in `docs/design/TDD.md`
(§D9 "Testing Strategy for the Change") / `docs/requirements/PRD.md` (§7 FR-1..FR-7)
and the `test()` blocks actually present in `src/app.test.js`. This is a source-code
comparison, not an execution result — see provenance notice in `TEST_QUALITY_REPORT.md`.

## Traceability matrix — TDD §D9 required bulk-endpoint tests

| # | Requirement (TDD §D9) | Test(s) | Status |
|---|---|---|---|
| 1 | Sum correctness (`10:2,100:2` → 200) | `src/app.test.js:40-44` | ✅ Covered |
| 2 | Single line (`10:2` → 20) | `src/app.test.js:46-50` | ✅ Covered |
| 3 | Per-line discount within one call | `src/app.test.js:52-56` | ✅ Covered |
| 4 | Invalid line rejection (`qty<=0`) | `src/app.test.js:66-70` | ✅ Covered |
| 5 | Malformed token / missing colon | `src/app.test.js:72-82` | ✅ Covered |
| 6 | Missing/empty `items` → 400 | `src/app.test.js:90-100` | ✅ Covered |
| 7 | Over-cap (>50 items) → 400 | `src/app.test.js:102-107` | ✅ Covered |
| 8 | Rounding (float artifact) | `src/app.test.js:58-63` | ✅ Covered |
| — | Regression: existing `priceWidget` tests | `src/app.test.js:6-14` | ✅ Covered |
| — | Regression: `/price`, `/health` unchanged | `src/app.test.js:138-154` | ✅ Covered |

**All 10 TDD §D9-mandated cases have a corresponding test.** This is a static-mapping
result, not proof the tests currently pass (no authoritative execution data this
iteration).

## Traceability matrix — PRD §7 functional requirements

| ID | Requirement | Test(s) | Status |
|---|---|---|---|
| FR-1 | Pricing formula `qty × unit × (1−discount)`, 2dp | `src/app.test.js:6-8` (unit), `144-148` (HTTP) | ✅ Covered |
| FR-2 | 10% discount at `qty ≥ 100` | `src/app.test.js:9-11`, `52-56` | ✅ Covered |
| FR-3 | `qty ≤ 0` → 400 guard | `src/app.test.js:12-14`, `150-154` | ✅ Covered |
| FR-4 | Query param coercion via `Number(...)` | Implicit in all HTTP tests | ⚠️ Weak — no dedicated test of coercion edge (e.g. `"010"`, `" 5 "`, hex strings) |
| FR-5 | `/health` → `200 { ok: true }` | `src/app.test.js:138-142` | ✅ Covered |
| FR-6 | JSON response format | Implicit (`res.json()` assertions throughout) | ✅ Covered (assertions parse JSON bodies) |
| FR-7 | Unknown routes → default 404 | `src/app.test.js:187-190` | ✅ Covered |
| — (documented quirk) | `NaN` qty/unit → `200 { total: null }` | `src/app.test.js:180-184` | ✅ Covered |
| — (D3/Q2, TDD) | `/price/bulk` rejects `NaN`/`Infinity` (stricter than `/price`) | `src/app.test.js:159-169` | ✅ Covered |

## Gaps identified

1. **HIGH — No method/verb-negative test.** Neither PRD §6 ("`GET`-only, JSON-only
   interface") nor the test suite asserts that non-`GET` verbs to `/price`,
   `/price/bulk`, or `/health` are rejected (Express's default is 404, per FR-7, but no
   test pins this for the new route specifically). *Requirement*: PRD §6, §7 FR-7.
   *Test file*: `src/app.test.js` (add near line 190).
2. **MEDIUM — FR-4 (parameter coercion) only weakly covered.** No test isolates
   `Number(...)` coercion edge inputs (leading/trailing whitespace, `"0x1F"` hex strings,
   `"Infinity"` literal string, boolean-like strings) independent of the `NaN`/finite
   checks already covered. *Requirement*: PRD §7 FR-4.
3. **LOW — `unit` non-validation is documented but only exercised once.**
   `src/app.test.js:201-205` covers negative `unit` for `/price/bulk`; there is no
   equivalent `/price` (single-item) test for negative/zero `unit`, even though PRD §7
   and TDD §9 note `unit` is unvalidated on both endpoints. *Requirement*: PRD §11 risk
   row "Unvalidated `unit`".
4. **LOW — No test for `items` values using array/bracket query syntax other than the
   repeated-param case.** `src/app.test.js:131-135` covers `?items=a&items=b` (→ array).
   Express also supports `?items[]=a` (→ object) per `qs`; not tested, though the guard
   (`typeof raw !== 'string'`) should already reject it — untested assumption.

## Requirements without any test: **0** (all explicit TDD §D9 / PRD §7 requirements have
at least one corresponding test). The 4 items above are **coverage-quality gaps**
(weak/edge coverage), not zero-coverage requirements.
