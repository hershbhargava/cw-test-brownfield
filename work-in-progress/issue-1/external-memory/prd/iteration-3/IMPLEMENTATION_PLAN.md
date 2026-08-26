# Implementation Plan — Issue #1, Developer Iteration 3 (CONTINUATION)

## Issue
Add `GET /price/bulk?items=qty:unit,qty:unit` that returns the summed discounted
total across line items, reusing the existing `priceWidget` logic. Include tests.

The endpoint and its core happy/edge-path tests were delivered in prior iterations
(28 passing tests). This iteration is a **test-only, add-coverage continuation** that
closes the three gaps raised in the QA Test Review (iteration-3 review).

## Mode
CONTINUATION — no production-code changes. `src/app.js` is unchanged; the existing
guards already produce the documented behavior for every gap below. This iteration
adds tests that *pin* that behavior so regressions are caught.

## Gaps to close (from QA Test Review SPECIAL INSTRUCTIONS)
1. **HIGH — non-GET verb rejection.** The service registers `app.get(...)` routes only.
   Per `docs/design/technical/API_CONTRACTS.md` ("Undefined routes"), any method/path
   not listed falls through to Express's default handler and returns `404`. No test
   previously asserted this for non-GET verbs.
   - Add: `POST`, `PUT`, `DELETE` to `/price` and to `/price/bulk` → assert `404` (6 tests).

2. **MEDIUM — oversized single numeric token.** `/price/bulk` bounds item *count* (max 50)
   but not per-token digit *length*. A single absurdly long digit string overflows
   `Number(...)` to `Infinity`, which the `Number.isFinite` guard rejects with `400`.
   The `1e400` scientific-notation form was already tested; the long-digit-string form
   was not.
   - Add: 400-digit qty token and 400-digit unit token on `/price/bulk` → assert `400`
     `{ error: "invalid item '<token>'" }` (2 tests).

3. **LOW — negative qty/unit boundaries.**
   - `/price/bulk` with `items=-5:10`: passes the finite guard, then `priceWidget`'s
     `qty <= 0` guard throws → `400 { error: 'qty must be positive' }`. Distinct from the
     existing zero-qty case.
   - `/price?qty=10&unit=-3`: unit is unvalidated (single-item path), so total is
     `-30` with status `200` — documented, intentional behavior.
   - Add: 1 negative-qty bulk test + 1 negative-unit `/price` test (2 tests).

## Constraints honored
- Do **not** regress the 28 passing tests.
- Do **not** add a coverage command to `package.json`'s `test` script (left as
  `node --test src/`; `test:coverage` remains the separate, pre-existing script).
- Backward compatibility of `/health`, `/price`, `/price/bulk` preserved (no impl edits).
- GATE-INTEGRITY: no quality gate weakened; tests only strengthen assertions.

## Verification strategy
Lightweight single-file run: `node --test src/app.test.js` (no full-suite / no coverage
invocation), per the Test Execution Policy.
