# Edge Case Review — Iteration 3 (Review Pass 3)

## Scope

`GET /price?qty=&unit=` and `GET /price/bulk?items=qty:unit,qty:unit,...` (`src/app.js`), plus their existing regression surface (`GET /health`).

## Edge Cases Enumerated and Test Coverage

| # | Edge case | Test(s) | Status |
|---|---|---|---|
| 1 | qty exactly 0 (boundary, not negative) | `app.test.js:66-70` (`items=0:2`) | ✅ |
| 2 | qty strictly negative (distinct from 0) | `app.test.js:247-251` (`items=-5:10`) | ✅ |
| 3 | unit negative (accepted, documented) | `app.test.js:201-205` (bulk), `:256-260` (single) | ✅ |
| 4 | qty exactly 99 (just below 100 discount threshold) | `app.test.js:193-197` | ✅ |
| 5 | qty exactly 100 (at discount threshold) | `app.test.js:9-11` (unit), `:52-56` (bulk, via 100:2) | ✅ |
| 6 | Non-numeric token (`abc:2`) | `app.test.js:72-76` | ✅ |
| 7 | Token missing colon | `app.test.js:78-82` | ✅ |
| 8 | Token with too many colons | `app.test.js:84-88` | ✅ |
| 9 | Empty token (adjacent delimiters `,,`) | `app.test.js:117-121` | ✅ |
| 10 | Empty token (trailing delimiter) | `app.test.js:123-127` | ✅ |
| 11 | Missing `items` param entirely | `app.test.js:90-94` | ✅ |
| 12 | Empty-string `items` param | `app.test.js:96-100` | ✅ |
| 13 | Repeated `items` param (Express parses as array, non-string) | `app.test.js:131-135` | ✅ |
| 14 | Exactly 50 items (cap boundary, inclusive) | `app.test.js:109-114` | ✅ |
| 15 | 51 items (cap boundary, exclusive) | `app.test.js:102-107` | ✅ |
| 16 | Per-line Infinity via literal (`1e400`) | `app.test.js:159-169` (bulk), `:171-175` (single) | ✅ |
| 17 | Per-line Infinity via overflow (400-digit string) | `app.test.js:230-242` | ✅ |
| 18 | **Aggregate sum overflow (individually-finite lines, non-finite sum)** | **`app.test.js:272-277`** | **✅ NEW this iteration** |
| 19 | NaN passthrough on legacy `/price` (documented, not rejected) | `app.test.js:180-184` | ✅ |
| 20 | Floating-point rounding (`0.1 + 0.2` style accumulation) | `app.test.js:58-63` | ✅ |
| 21 | Non-GET HTTP verbs on both endpoints | `app.test.js:212-222` | ✅ |
| 22 | Unknown route (404 fallback) | `app.test.js:187-190` | ✅ |
| 23 | `/health` liveness unaffected by bulk changes | `app.test.js:138-142` | ✅ |

## New Edge Case Analysis This Pass (Q2a)

The aggregate-overflow case (#18) deserves emphasis as it is qualitatively different from the per-line overflow cases (#16, #17):

- **Per-line overflow** (#16/#17): a *single token's* numeric value exceeds `Number.MAX_VALUE`. Caught by the per-line `Number.isFinite(qty) || Number.isFinite(unit)` guard at `src/app.js:54`, *before* `priceWidget` is ever called for that line.
- **Aggregate overflow** (#18): *every individual line* is well within range and passes `priceWidget` successfully (`1e307 * 1 * 0.9 = 9e306`, finite), but the *running sum* across up to 50 such lines exceeds `Number.MAX_VALUE` (`50 × 9e306 = 4.5e308`). This is only observable by tracking the accumulator across loop iterations — no single-line check can catch it. This is why it was a distinct, separately-tracked requirement (TDD §D3/Q2a) rather than a variant of the existing per-line check.

Both classes are now covered, closing the full space of ways a `/price/bulk` response could serialize a nonsensical `{ "total": null }` under a 200 status.

## Edge Cases Considered and Deliberately Not Required

- **Floating-point precision loss well below `MAX_VALUE`** (e.g. summing many very-small fractional values with per-line but not aggregate rounding): not a defined requirement in the TDD; the existing rounding test (#20) covers the documented rounding contract (`+(...).toFixed(2)` on the final total). Not flagged as a gap — this is standard IEEE-754 behavior, not a bug.
- **Unicode / non-ASCII in the `items` string**: `Number(...)` on a non-numeric string (including unicode) simply produces `NaN`, which is already rejected by the same finite-guard path as any other non-numeric token (#6 generalizes to this case; `Number.isFinite(NaN)` is `false`). No dedicated test needed — behavior is already exercised by the existing non-numeric-token test's code path.
- **Extremely large item counts sent as a single giant query string** (separate from the 50-item logical cap): bounded implicitly by Express's/Node's default HTTP header/URL length limits before the handler ever runs; outside application-code scope.

## Residual Risk

None blocking. The two LOW/optional items from TEST_GAP_ANALYSIS.md (Content-Type header assertion, combined cap+discount interaction test) are informational only and do not represent uncovered edge-case *behavior* — they represent additional *assertion* depth on already-covered code paths.
