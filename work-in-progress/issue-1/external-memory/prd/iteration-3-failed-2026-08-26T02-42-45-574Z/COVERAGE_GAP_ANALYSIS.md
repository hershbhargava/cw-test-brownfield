# Coverage Gap Analysis — Issue #1, QA Review Iteration 3

## ⛔ Coverage gate: NOT-EVALUABLE

Per GATE-INTEGRITY rule 6: the authoritative source for this review
(`work-in-progress/issue-1/external-memory/prd/iteration-3/metadata.json`) does not
exist on disk at review time (directory contains only `FINAL_AI_PROMPT.md`). No
`lcov`/coverage report is available at the authoritative path.

**No coverage percentage (statements/branches/functions/lines) is stated anywhere in
this document.** Per rule 6, this is not optional — a coverage figure copied or
estimated from any other source (including the git-historical `metadata.json` found
in commit `e36405e`, which is superseded and not live — see
`TEST_QUALITY_REPORT.md` provenance notice) would violate GATE-INTEGRITY and is
explicitly prohibited.

**This gate alone is sufficient to prevent a PASS/APPROVE verdict**, independent of
any other finding in this review.

## What CAN be assessed without coverage tooling: structural code-path review

In place of instrumented coverage, this section maps `src/app.js`'s branches
directly to tests by reading the source, to identify anything **structurally**
unexercised.

### `src/app.js` — `/price/bulk` handler (lines 32-63)

| Line(s) | Branch | Test(s) exercising it |
|---|---|---|
| 37 | `typeof raw !== 'string' \|\| raw === ''` (missing) | `src/app.test.js:90` |
| 37 | `typeof raw !== 'string' \|\| raw === ''` (empty) | `:96` |
| 37 | `typeof raw !== 'string'` (repeated param → array) | `:131` |
| 41 | `tokens.length > MAX_BULK_ITEMS` (true) | `:102` |
| 41 | `tokens.length > MAX_BULK_ITEMS` (false, boundary=50) | `:109` |
| 47 | `parts.length !== 2` (missing colon, length 1) | `:78` |
| 47 | `parts.length !== 2` (extra colon, length 3) | `:84` |
| 47 | `parts.length !== 2` (empty token via adjacent/trailing delimiter) | `:117,123` |
| 54 | `!Number.isFinite(qty)` (NaN via non-numeric) | `:72` |
| 54 | `!Number.isFinite(qty)` (Infinity, `1e400` literal) | `:159` |
| 54 | `!Number.isFinite(qty)` (Infinity, long-digit-string) | `:230` (new this iteration) |
| 54 | `!Number.isFinite(unit)` (Infinity, `1e400` literal) | `:165` |
| 54 | `!Number.isFinite(unit)` (Infinity, long-digit-string) | `:237` (new this iteration) |
| 57 | `priceWidget` throws (`qty <= 0`, zero) | `:66` |
| 57 | `priceWidget` throws (`qty <= 0`, negative) | `:247` (new this iteration) |
| 59 | Happy-path response | `:40,46,52,58,109,193,201` |
| **57/59** | **Running-sum overflow to `Infinity` after the loop** | **✗ NOT EXERCISED — see `TEST_GAP_ANALYSIS.md` HIGH finding** |

### `src/app.js` — `priceWidget` (lines 4-18) and `/price` (lines 21-26)

| Line(s) | Branch | Test(s) |
|---|---|---|
| 11 | Finite guard: non-finite `qty`/`unit` → throw | `:171` (`/price` qty=1e400), `:159,165,230,237` (bulk) |
| 11 | NaN explicitly bypasses the finite guard (documented) | `:180` (`/price` NaN → `{total:null}`, 200) |
| 15 | `qty <= 0` → throw | `:12` (unit test, `priceWidget(0,2)`), `:150` (`/price` route), `:66` (bulk route) |
| 16 | Discount `qty >= 100` | `:9` (unit test `priceWidget(100,2)===180`), `:144,52` |
| 16 | No discount `qty < 100` | `:6` (unit test), `:193` (boundary qty=99) |
| 21 | `/health` | `:138` |

**All branches in the codebase are structurally exercised by at least one test,
except the running-sum-overflow path noted above**, which has no guarding branch in
the code at all (that's the gap — see `TEST_GAP_ANALYSIS.md`).

## Files reviewed

| File | Type | Notes |
|---|---|---|
| `src/app.js` | Source (SUT) | 67 lines, single file, no layering |
| `src/app.test.js` | Test | 261 lines, 38 test cases (static `test(...)` sites: 34; the non-GET-verb loop at `:212-222` expands to 6 at runtime) |

No files in the repository have zero test presence — `src/app.js` is the only
production source file and every one of its route handlers and the `priceWidget`
function has direct test coverage (structurally, per the table above).

## Recommendation

1. **Immediate**: fix the pipeline so the qa-test-execution `metadata.json`/lcov
   artifact remains at the live authoritative path when the qa-review phase reads
   it (process gap — the artifact-lifecycle "supersede on next phase start" behavior
   is deleting the very file this review is required to read). This is a
   pipeline/infra issue, not a code-quality regression, but it blocks a real
   coverage-based verdict.
2. **Code**: add the running-sum finiteness guard identified in
   `TEST_GAP_ANALYSIS.md`, plus a regression test, in the next iteration.
