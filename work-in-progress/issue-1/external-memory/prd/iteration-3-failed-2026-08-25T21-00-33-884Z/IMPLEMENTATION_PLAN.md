# Implementation Plan — Issue #1: Add Bulk Pricing Endpoint

**Iteration**: 3 · **Role**: developer-ai · **Branch**: `feature/issue-1`
**Mode**: New Feature (Additive), Node.js/Express (CommonJS)

## Document Summary (precedence: TDD > PRD > other)

- **Issue #1**: Add `GET /price/bulk?items=qty:unit,qty:unit` returning the summed
  discounted total across line items, reusing `priceWidget`. Include tests.
- **TDD.md §D1–D11** (authoritative): single additive `GET /price/bulk` route in
  `src/app.js`. Reuse `priceWidget` unchanged. Resolved decisions in §D3:
  - Q1: success envelope `200 { "total": <sum> }` (no per-line breakdown).
  - Q2: all-or-nothing — any malformed token / NaN / failing guard rejects the WHOLE
    request with `400 { error }`. NaN is rejected (stricter than legacy `/price`).
  - Q3: cap at **50** items → `400 { error: "too many items (max 50)" }`.
  - Q4: missing/empty `items` → `400 { error: "items is required" }`.
  - Q5: `,` splits items, `:` splits qty/unit; a token must contain exactly one `:`.
  - Q6: sum per-line `priceWidget` outputs, then round once: `+(sum).toFixed(2)`.
- **API_CONTRACTS.md §3**: exhaustive error strings —
  `"items is required"`, `"too many items (max 50)"`, `"invalid item '<token>'"`,
  `"qty must be positive"` (from priceWidget). Success `{ "total": <number> }`.
- **PRD.md**: product intent; bulk pricing was previously Out of Scope, now added.
  No auth/persistence/rate-limiting added (out of scope).

## Gap Fixes (from architect TDD_DELTA review — HIGHEST PRIORITY)

The architecture review (`.../prd/iteration-3-failed-.../GAP_ANALYSIS.md`) raised 5
gaps (0 CRITICAL, 0 HIGH, 2 MEDIUM, 3 LOW). All are folded into this implementation:

| Gap | Priority | Resolution in this implementation |
|-----|----------|-----------------------------------|
| GAP-DIFF-001 | MEDIUM | HTTP tests use `app.listen(0)` (ephemeral port) + built-in global `fetch`, `server.close()` in teardown. **No new dependency** (no supertest). |
| GAP-DIFF-002 | MEDIUM | Type-guard: `typeof raw !== 'string'` → treated same as missing → `400 "items is required"` (handles repeated-param arrays / bracket objects before `.split`). |
| GAP-DIFF-003 | LOW | Update `README.md` endpoint list to add `GET /price/bulk`. |
| GAP-DIFF-004 | LOW | Add test for adjacent/trailing delimiters (`items=10:2,,100:2`, `items=10:2,`) → `400 "invalid item ''"`. |
| GAP-DIFF-005 | LOW | Type-guard from GAP-DIFF-002 prevents reflecting internal JS runtime error text; noted in summary. |

## Requirements Checklist

- [ ] FR-BULK-1: New route `GET /price/bulk` registered on existing `app`.
- [ ] FR-BULK-2: Reuse `priceWidget` unchanged, once per line.
- [ ] FR-BULK-3: Parse `items` (comma-separated `qty:unit`), Number-coerce.
- [ ] FR-BULK-4: Invalid/malformed line → `400 { error }` (all-or-nothing).
- [ ] FR-BULK-5: Success envelope `{ "total": <summed number> }`.
- [ ] FR-BULK-6: Automated tests in `node:test` style.
- [ ] Q3 cap (50), Q4 empty/missing, Q2 NaN rejection, Q6 final rounding.
- [ ] Backward compat: `/price` and `/health` byte-for-byte unchanged.

## Implementation Tasks

### Setup & Architecture
- Single-file change in `src/app.js` (baseline has no layering; §D4 "layering note").
- No new dependency, no `package.json` change → no lockfile concern.

### Core Implementation (`src/app.js`)
Add handler implementing §D4 pseudocode + GAP-DIFF-002 type guard:
1. `raw = req.query.items`; if `typeof raw !== 'string' || raw === ''` → 400 "items is required".
2. `tokens = raw.split(',')`; if `tokens.length > 50` → 400 "too many items (max 50)".
3. For each token: split on `:`; require exactly 2 parts; `Number()` coerce; reject
   `NaN` → 400 `invalid item '<token>'`. Call `priceWidget(qty, unit)` (throws on
   `qty<=0`, caught → 400 with its message).
4. Sum line totals; `res.json({ total: +(sum).toFixed(2) })`.
5. Whole body wrapped in `try/catch → 400 { error: e.message }` (existing idiom).

### Tests (`src/app.test.js`) — write FIRST (TDD red → green)
HTTP-level tests via ephemeral port + `fetch` (GAP-DIFF-001):
1. Sum correctness `items=10:2,100:2` → 200 `{total:200}`.
2. Single line `items=10:2` → 200 `{total:20}`.
3. Per-line discount `items=100:2,10:2` → 200 `{total:200}`.
4. Invalid line `items=0:2` → 400 "qty must be positive".
5. Malformed token `items=abc:2` → 400 "invalid item 'abc:2'"; `items=10` → 400.
6. Missing `items` → 400 "items is required"; `items=` → 400.
7. Over-cap (51 items) → 400 "too many items (max 50)".
8. Rounding (floating-point artifact) → 2-decimal output.
9. Adjacent/trailing delimiter `items=10:2,,100:2` & `items=10:2,` → 400 "invalid item ''".
10. Non-string items (repeated param `items=10:2&items=100:2`) → 400 "items is required".
Regression: keep 3 existing `priceWidget` unit tests; add `/price` & `/health` HTTP checks.

## Verification
- Lightweight: run only `src/app.test.js` via `node --test src/app.test.js` (single spec).
- Do NOT run full suite (QA workflow's job). No tsconfig → no typecheck (plain JS).
