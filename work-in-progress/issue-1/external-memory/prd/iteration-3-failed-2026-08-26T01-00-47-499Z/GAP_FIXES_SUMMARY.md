# Gap Fixes Summary — QA Test Review → Developer Iteration 3

All three gaps from the QA Test Review were **test-coverage gaps**, not code defects.
The implementation already produced the correct/documented behavior; this iteration
adds regression tests that assert it. No production code was changed.

---

## HIGH — Non-GET verbs must be rejected on documented paths
**Finding:** No test asserted that `/price` and `/price/bulk` reject non-GET verbs.
**Reality in code:** `src/app.js` registers only `app.get(...)` handlers; unmatched
method/path falls through to Express's default 404 (see `API_CONTRACTS.md` §Undefined
routes).
**Fix (tests added):**
```
POST   /price?qty=10&unit=2   → 404
PUT    /price?qty=10&unit=2   → 404
DELETE /price?qty=10&unit=2   → 404
POST   /price/bulk?items=10:2 → 404
PUT    /price/bulk?items=10:2 → 404
DELETE /price/bulk?items=10:2 → 404
```
Implemented as a `for (const method of ['POST','PUT','DELETE'])` loop asserting
`res.status === 404`.

---

## MEDIUM — Oversized single numeric token
**Finding:** The 50-item cap bounds item *count*, not per-token digit *length*; the
long-digit-string overflow case was untested (only `1e400` scientific form existed).
**Reality in code:** `Number('9'.repeat(400)) === Infinity`; the `Number.isFinite(qty) ||
Number.isFinite(unit)` guard rejects it with a `400 invalid item` error.
**Fix (tests added):**
```
/price/bulk?items=<400×'9'>:2 → 400 { error: "invalid item '<400×'9'>:2'" }
/price/bulk?items=2:<400×'9'> → 400 { error: "invalid item '2:<400×'9'>'" }
```

---

## LOW — Negative qty (bulk) and negative unit (single-item)
**Finding:** No negative-qty bulk test distinct from zero; no negative-unit `/price` test.
**Reality in code:**
- `items=-5:10`: passes finite guard → `priceWidget` `qty<=0` throws → bulk try/catch
  relays `400 { error: 'qty must be positive' }`.
- `/price?qty=10&unit=-3`: unit unvalidated on single-item path → `200 { total: -30 }`
  (documented behavior, no discount below qty 100).
**Fix (tests added):**
```
/price/bulk?items=-5:10   → 400 { error: 'qty must be positive' }
/price?qty=10&unit=-3     → 200 { total: -30 }
```

---

## Verification
`node --test src/app.test.js` → **38 pass / 0 fail** (no regressions).

## Non-goals / guardrails
- No change to `package.json` `test` script (no coverage command added).
- No change to `src/app.js` behavior or endpoint contracts.
- No quality gate modified or weakened.
