# Gap Fixes Summary — Issue #1 (Iteration 3, addressing QA Test Review 72/100 REVIEW_AGAIN)

| Gap ID | Severity | Status | Fix |
|--------|----------|--------|-----|
| Infinity bypasses NaN guard (`/price/bulk` & `/price` return `200 {total:null}`) | **HIGH** | ✅ FIXED | Finite validation added on both endpoints |
| `/price` NaN→null passthrough untested (could silently regress) | MEDIUM | ✅ FIXED | Lock-in regression test added |
| Unknown-route 404 untested (FR-7) | LOW | ✅ FIXED | 404 regression test added |
| `qty=99` boundary (just-below-discount) untested | LOW | ✅ FIXED | Boundary test added |
| Negative unit price behavior unasserted | LOW | ✅ FIXED | Documented-behavior test added |
| Non-positive-qty unit test doesn't assert message | LOW | ✅ FIXED | Strengthened `assert.throws` matcher |
| Coverage not collected → QA gate NOT-EVALUABLE | (gate) | ✅ ENABLED | Added `test:coverage` script (additive; no gate weakened) |

## HIGH — Non-finite (Infinity) input

**Root cause**: `Number("1e400")` → `Infinity`. `Number.isNaN(Infinity)` is `false`,
so it passed the bulk endpoint's NaN guard; `Infinity <= 0` is `false`, so
`priceWidget`'s positivity guard didn't throw; the computed `Infinity` total
serialized to JSON `null` with a misleading `200`.

**Fix — `src/app.js`**:

1. `priceWidget` (lines 10–14) — reject non-finite-but-not-NaN values so Infinity
   throws, while **NaN is deliberately still allowed through** to preserve the
   documented `/price` NaN → `{ total: null }, 200` passthrough (API_CONTRACTS
   §"Error semantics"):
   ```js
   for (const v of [qty, unitPrice]) {
     if (typeof v === 'number' && !Number.isNaN(v) && !Number.isFinite(v)) {
       throw new Error('qty and unit must be finite');
     }
   }
   ```
2. `/price/bulk` per-token guard (line 54) — `Number.isNaN(...)` → `!Number.isFinite(...)`,
   so both NaN and Infinity tokens are rejected as `invalid item '<token>'`, keeping
   the all-or-nothing 400 semantics:
   ```js
   if (!Number.isFinite(qty) || !Number.isFinite(unit)) {
     return res.status(400).json({ error: `invalid item '${token}'` });
   }
   ```

**Verification (empirical)**:
| Request | Before | After |
|---|---|---|
| `GET /price/bulk?items=1e400:2` | `200 {"total":null}` | `400 {"error":"invalid item '1e400:2'"}` |
| `GET /price/bulk?items=2:1e400` | `200 {"total":null}` | `400 {"error":"invalid item '2:1e400'"}` |
| `GET /price?qty=1e400&unit=2` | `200 {"total":null}` | `400 {"error":"qty and unit must be finite"}` |
| `GET /price?qty=abc&unit=2` (NaN) | `200 {"total":null}` | `200 {"total":null}` (unchanged — MEDIUM lock-in) |
| `GET /price/bulk?items=10:2,100:2` | `200 {"total":200}` | `200 {"total":200}` (unchanged) |
| `GET /price?qty=100&unit=2` | `200 {"total":180}` | `200 {"total":180}` (unchanged) |

## Tests added / strengthened (`src/app.test.js`)
- `bulk: rejects non-finite (Infinity) qty token` (line 159)
- `bulk: rejects non-finite (Infinity) unit token` (line 165)
- `price: rejects non-finite (Infinity) qty` (line 171)
- `price: NaN qty still passes through as { total: null }, 200 (documented)` (line 180)
- `regression: unknown route returns 404` (line 187)
- `bulk: qty=99 gets no discount (just below threshold)` (line 193)
- `bulk: negative unit price yields negative total (documented behavior)` (line 201)
- Strengthened existing `rejects non-positive qty` unit test with
  `{ message: 'qty must be positive' }` matcher (line 13)

Total suite: 21 → **28 tests, all passing**.

## Coverage gate enablement
`package.json` gains `"test:coverage": "node --experimental-test-coverage --test src/"`.
The existing `"test"` gate is **unchanged**; no threshold added or lowered. This is
purely additive so the QA phase can now collect coverage and evaluate the gate.
