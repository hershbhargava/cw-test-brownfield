## 🔨 Developer Iteration 3 Complete — QA-blocker fixes

**Objective**: Fix the HIGH non-finite-input bug and add regression tests / coverage per the QA Test Review (was 72/100 REVIEW_AGAIN).

### Changes Made
- **HIGH fix**: `Infinity`-producing input (e.g. `1e400`) now returns `400` on both `/price/bulk` and `/price` instead of the misleading `200 {"total":null}`. `Number("1e400")` is `Infinity`, which slipped past the `Number.isNaN` guard and serialized as `null`.
- `/price` still returns `200 {"total":null}` for genuine `NaN` (`qty=abc`) — the documented legacy passthrough is preserved; only Infinity is rejected.
- `/price/bulk` per-token guard tightened `Number.isNaN` → `!Number.isFinite`, keeping all-or-nothing 400 semantics.
- Added `test:coverage` npm script so the QA coverage gate is now evaluable (existing `test` script unchanged — no gate weakened).

### Files Modified
- `src/app.js` — finite-input validation on both pricing paths.
- `src/app.test.js` — +7 regression tests (Infinity×3, NaN passthrough, 404, qty=99 boundary, negative-unit) + strengthened non-positive-qty message assertion.
- `package.json` / `package-lock.json` — added coverage script (no dependency change).

### Testing
- `node --test src/app.test.js` → **28/28 pass** (was 21).
- `npm run test:coverage` → 28/28 pass + coverage report emitted.
- `/health`, `/price`, `priceWidget`, and normal bulk paths verified backward-compatible.

### Next Steps
- `qa-test-execution-workflow` runs the full suite with coverage; QA test review can re-evaluate the (now-evaluable) coverage gate.
