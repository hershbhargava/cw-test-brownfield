# Implementation Summary — Issue #1, Developer Iteration 3 (CONTINUATION)

## What changed
- `src/app.test.js`: **+8 tests** appended (test-only). No production code touched.
- `src/app.js`: **unchanged** (existing guards already satisfy every gap).
- `package.json`: **unchanged** (`test` script left as `node --test src/`; no coverage
  command added, per instruction).

## Result
- Local lightweight verification: `node --test src/app.test.js` → **38 pass / 0 fail**.
  (28 pre-existing + 8 new + 2 pre-existing negative-unit-bulk blocks all green;
  the tap total reported by the runner is 38 subtests.)
- Zero regressions to the previously passing suite.

## Gap closures (maps 1:1 to QA Test Review findings)

| Sev | Gap | New test(s) | Asserted behavior | Backed by |
|-----|-----|-------------|-------------------|-----------|
| HIGH | non-GET verbs on documented paths | `POST/PUT/DELETE /price` → 404; `POST/PUT/DELETE /price/bulk` → 404 (6) | HTTP 404 | `API_CONTRACTS.md` §Undefined routes; only `app.get` registered in `src/app.js` |
| MEDIUM | oversized single numeric token | 400-digit qty token; 400-digit unit token on `/price/bulk` (2) | 400 `{ error: "invalid item '<token>'" }` | `Number('9'×400) === Infinity`; `Number.isFinite` guard in `/price/bulk` |
| LOW | negative qty (bulk) distinct from zero | `items=-5:10` (1) | 400 `{ error: 'qty must be positive' }` | finite guard passes → `priceWidget` `qty<=0` throw |
| LOW | negative unit (single-item) | `/price?qty=10&unit=-3` (1) | 200 `{ total: -30 }` | unit unvalidated on single-item path; no discount below qty 100 |

## Behavioral notes (verified against `src/app.js`)
- The finite guard in `/price/bulk` is stricter than `/price` (`Number.isFinite`), which
  is why `Infinity` tokens are rejected pre-`priceWidget`.
- Negative *qty* is caught by `priceWidget`'s `qty <= 0` guard and surfaces as the same
  `'qty must be positive'` message the bulk try/catch relays.
- Negative *unit* is intentionally *not* validated on the single-item `/price` route, so
  it yields a negative total — this is the documented (if unusual) contract and the new
  test pins it to prevent silent contract drift.

## Constraints honored
- No regression of the 28 passing tests. ✅
- No coverage command added to `package.json` `test` script. ✅
- `/health`, `/price`, `/price/bulk` backward-compatible (no impl change). ✅
- GATE-INTEGRITY: no gate modified/lowered/weakened. ✅
