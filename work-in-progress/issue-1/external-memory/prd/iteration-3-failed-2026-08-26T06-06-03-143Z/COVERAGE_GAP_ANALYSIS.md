# Coverage Gap Analysis — Iteration 3

**Authoritative source:** `prd/iteration-3/metadata.json` (`coverage.source: "lcov"`), raw data at `prd/iteration-3/reports/_artifacts/0/lcov.info`.

## Coverage Gate: PASS

| Metric | Actual | Threshold | Delta | Gate |
|---|---|---|---|---|
| Statements | 100% | 70% | +30 | PASS |
| Lines | 100% | 70% | +30 | PASS |
| Functions | 100% | 70% | +30 | PASS |
| Branches | 96.43% | 70% | +26.43 | PASS |

Unlike the previous review pass (where the qa-test-execution run had not yet produced coverage data and the gate was NOT-EVALUABLE), this iteration's `metadata.json` and `TEST_EXECUTION_REPORT.md` contain a complete, successful lcov run (`exit_code: 0`, `result_source: "infra-counts"`). All four metrics comfortably clear the default 70% threshold — this is treated as the authoritative, binding result for this review per GATE-INTEGRITY rule 5.

## Branch Coverage Detail (96.43% = 27/28)

Source: `lcov.info` — `BRF:28` (branches found), `BRH:27` (branches hit).

Line-by-line reconciliation of every `BRDA` record in `lcov.info` against `src/app.js`:

| Line | Branch context | Hit count | Status |
|---|---|---|---|
| 1 | `require('express')` (module init) | 1 | Hit |
| 4 | `priceWidget` function entry | 71 | Hit |
| 10 | `for (const v of [qty, unitPrice])` loop | 141 | Hit |
| 11 | `typeof v === 'number' && !NaN && !finite` (both branches) | 140 / 1 | Hit |
| 15 | `qty <= 0` (both branches) | 70 / 4 | Hit |
| 16 | `qty >= 100 ? 0.1 : 0` (both branches, + 1 more BRDA for ternary structure) | 66 / 4 / 62 | Hit |
| 21 | `/health` route reached | 1 | Hit |
| 22 | `/price` route reached | 5 | Hit |
| 25 | try/catch around `/price` handler | 2 | Hit |
| 32 | `/price/bulk` route reached | 22 | Hit |
| 37 | `typeof raw !== 'string' \|\| raw === ''` (both branches) | 20 / 3 | Hit |
| 40 | `tokens.length > MAX_BULK_ITEMS` (both branches) | 19 / 1 | Hit |
| 44-45 | `for (const token of tokens)` loop entry | 18 / 72 | Hit |
| 47 | `parts.length !== 2` (both branches) | 4 | Hit |
| 50 | token split into qty/unit | 68 | Hit |
| 54 | `!Number.isFinite(qty) \|\| !Number.isFinite(unit)` (both branches) | 65 / 5 | Hit |
| 57 | `total += priceWidget(...)` | 63 | Hit |
| 59-60 | success response / outer catch | 7 / 2 | Hit |
| **66** | **`if (require.main === module) app.listen(3000);`** | **0** | **NOT hit — the only uncovered branch** |

`src/app.js:66` is the CommonJS "run as main script vs. imported as a module" guard. Under `node --test src/`, the test file does `require('./app')` (`src/app.test.js:3`), so `require.main` is always the test runner, never `app.js` — this branch's `true` side is **unreachable by construction** in any unit-test context. Reaching it would require either (a) spawning `node src/app.js` as a genuine child process and asserting it binds port 3000, or (b) mocking `require.main`, neither of which is proportionate for a one-line, framework-idiomatic bootstrap guard with no business logic.

**Conclusion: this is not a meaningful coverage gap.** It is the single most common source of "why isn't my Node service at 100% branch coverage" and is normally either accepted as-is or excluded via an `/* istanbul ignore next */`-style comment. No action required; recommend treating branch coverage on this file as effectively 100% (27/27 meaningful branches) for gating purposes going forward, and optionally adding `/* c8 ignore next */` above line 66 in a future cleanup pass to make the exclusion explicit (informational, not blocking).

## What Coverage Does NOT Tell You (context for the HIGH finding elsewhere in this review)

100% statement/line/function coverage and 96.43% (effectively 100% meaningful) branch coverage confirm that **every line and branch that exists in `src/app.js` was executed by the test suite at least once.** It does **not** and cannot confirm that every *value* passed through those lines is safe. The aggregate-overflow defect documented in `TEST_QUALITY_REPORT.md` and `TEST_GAP_ANALYSIS.md` occurs because `src/app.js:57` (`total += priceWidget(qty, unit)`) is fully covered — hit 63 times across the suite — but the *values* summed during those 63 hits never happen to overflow `total` past `Number.MAX_VALUE`. There is no missing branch to cover; there is a missing **guard** (an `if (!Number.isFinite(total))` check that doesn't exist yet). This is why the coverage gate can legitimately PASS at 100%/96.43% while a genuine, reproducible HIGH-severity defect remains open — coverage measures code executed, not value-space explored. See `EDGE_CASE_REVIEW.md` for the full boundary-value analysis.
