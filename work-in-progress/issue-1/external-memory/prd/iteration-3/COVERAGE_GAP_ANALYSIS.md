# Coverage Gap Analysis — Iteration 3 (Review Pass 3)

**Source:** `work-in-progress/issue-1/external-memory/prd/iteration-3/reports/_artifacts/0/lcov.info` (authoritative, read in full)
**Coverage gate:** default 70% threshold — **PASS** on every dimension, with wide margin.

## Summary

| Dimension | Covered / Total | % |
|---|---|---|
| Lines | 74 / 74 | 100% |
| Functions | (all) | 100% |
| Statements | (all) | 100% |
| Branches | 28 / 29 | 96.55% |

This is a slight improvement over the prior review pass (96.43% → 96.55% branches), because the newly-added Q2a code introduced one new branch and it is fully covered on both outcomes — see below.

## Uncovered Branch (the only gap)

- **`src/app.js:74`** — `if (require.main === module) app.listen(3000);`
- lcov record: `BRDA:74,1,0,0` (branch block 1, branch 0, hit count **0**)
- **Not a real gap.** This is the standard Node.js "only start the server when this file is run directly" idiom. Under `node --test`, the file is always `require()`d as a module (never the direct entrypoint), so `require.main === module` is structurally always `false` in the test process — there is no way to exercise the `true` branch without literally spawning the file as a separate process via `node src/app.js`, which would test process bootstrapping, not application logic. This exact same idiom was flagged as benign in both prior review passes (previously at line 66, shifted to line 74 purely because the Q2a guard added 8 lines above it — no behavioral change to this line itself).
- **Recommendation:** no action. Excluding this line from coverage accounting (e.g. via an lcov `LCOV_EXCL_LINE` marker or nyc/c8 ignore comment) would be a reasonable cosmetic cleanup but is not required — the 96.55% branch figure already clears the gate comfortably and this is a well-understood, universally-accepted exception pattern.

## New Branch Introduced by Q2a — Confirmed Fully Covered

- **`src/app.js:63`** — `if (!Number.isFinite(total)) { ... }`
- lcov record: `BRDA:63,26,0,1` (branch block 26, branch 0 — the `true` outcome — hit count **1**)
- The implicit `false`-outcome (loop continues, i.e. `total` stays finite and the `if` is skipped) is exercised by every other passing bulk test that reaches this line — approximately 33 of the 39 tests hit `/price/bulk` with valid, non-overflowing items, each iterating this branch at least once per line item (up to 50 iterations for the boundary test), so the false-branch hit count is very high (not shown individually in the summary `BRDA` line, but implied by `LH:74` = all 74 lines hit at least once, including line 63, combined with the `true`-branch hit=1 record).
- **Confirms the fix from Gap 1 (TEST_GAP_ANALYSIS.md) is genuinely exercised in both directions, not just added dead code.**

## No Other Coverage Regressions

Diffing the current `lcov.info` against the prior review pass's reasoning: every other `DA`/`BRDA` record that existed before (per-line malformed-token checks, cap check, empty/missing checks, priceWidget's finite-guard loop and qty<=0 guard, discount calc, `/price` handler, `/health` handler) remains at full hit counts. The only structural delta is the addition of the Q2a lines (58-65) and the corresponding line-number shift of everything below them (e.g. `module.exports` and the entrypoint guard each moved down by ~8 lines).

## Verdict

**Coverage gate: PASS.** No genuine coverage gaps. The sole uncovered branch is a structurally-unreachable-under-test, universally-benign Node.js entrypoint idiom, consistent with the finding in both prior review passes. No gate-weakening was performed or is needed — this PASS rests entirely on real, high, and slightly-improved coverage numbers from the authoritative `lcov.info`.
