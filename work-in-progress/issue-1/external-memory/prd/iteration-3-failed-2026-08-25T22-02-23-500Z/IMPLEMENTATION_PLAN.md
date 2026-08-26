# Developer Implementation Plan — Issue #1 (Iteration 3 / QA-blocker fix pass)

## Session context
- Iteration: 3 (CONTINUATION) — this pass addresses the QA Test Review verdict
  **72/100 REVIEW_AGAIN**. Special instructions require CODE CHANGES (not re-verify).
- Branch: `feature/issue-1`

## Document changes since last iteration
`git diff --stat HEAD~1 -- docs/` → **no changes**. Requirements unchanged; the work
here closes gaps the QA review found in the *tests/implementation*, not the spec.

## QA-review blockers to remediate (from special_instructions)
1. **HIGH** — Infinity-producing input bypasses the NaN guard: `/price/bulk?items=1e400:2`
   and `/price?qty=1e400` returned `200 {"total":null}` instead of `400`.
   `Number("1e400") === Infinity`; `Number.isNaN(Infinity) === false`;
   `Infinity <= 0 === false`; `JSON.stringify(Infinity) === null`.
3. Regression tests: (1) Infinity → 400 on both endpoints; (2) `/price` NaN→null
   passthrough lock-in; (3) unknown-route 404; (4) `qty=99` boundary (no discount);
   (5) negative-unit behavior; (6) assert error message on non-positive-qty unit test.
4. Enable coverage so the QA coverage gate becomes evaluable: add
   `"test:coverage": "node --experimental-test-coverage --test src/"`, keep `test`.

## Requirements checklist
- [x] `priceWidget` rejects non-finite (Infinity/-Infinity) inputs, but NOT NaN, so
      `/price` keeps its documented NaN→null passthrough — `src/app.js:10-14`
- [x] `/price/bulk` per-token guard switched `Number.isNaN` → `!Number.isFinite`
      (rejects NaN AND Infinity, all-or-nothing 400) — `src/app.js:54`
- [x] 6 regression tests added/strengthened — `src/app.test.js:13,156-205`
- [x] `test:coverage` script added; `test` unchanged — `package.json:9`
- [x] `/health`, `/price` (normal + NaN passthrough), `priceWidget`, bulk normal paths
      all backward-compatible (verified empirically + 28/28 tests)

## Gate integrity
No quality gate weakened. The coverage gate is made *evaluable* by ADDING a coverage
script (additive) — the existing `test` gate is untouched; no threshold is lowered.

## Verification (lightweight, per policy)
- `node --test src/app.test.js` → 28/28 pass.
- `npm run test:coverage` → 28/28 pass + coverage report emitted.
- Empirical endpoint probes confirm 400 on Infinity (both), 200 null on `/price` NaN,
  unchanged normal paths, 404 on unknown route.

## Tasks
1. [x] Fix `priceWidget` finite-guard (Infinity only, preserve NaN passthrough).
2. [x] Tighten `/price/bulk` guard to `Number.isFinite`.
3. [x] Add/strengthen 6 regression tests.
4. [x] Add `test:coverage` script; reconcile lockfile (no dep change).
5. [x] Verify + write artifacts + commit.
