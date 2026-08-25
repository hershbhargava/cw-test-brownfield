# Coverage Gap Analysis — Issue #1, Iteration 3

## Coverage Data Availability

**UNAVAILABLE.** The authoritative qa-test-execution metadata
(`work-in-progress/issue-1/external-memory/prd/iteration-3-failed-2026-08-25T21-15-31-927Z/metadata.json`,
timestamp `2026-08-25T21:14:12.500Z`) reports `"coverage": null`. No
statement/branch/function/line percentages were collected. Per GATE-INTEGRITY
rule 6, this review does **not** state, copy, or estimate any coverage
percentage anywhere in this document or any other artifact in this iteration.

**Root cause**: `package.json`'s `test` script is `node --test src/` with no
coverage flag. Node's built-in test runner supports coverage via
`--experimental-test-coverage`, but it is not enabled. No `nyc`, `c8`, or
`istanbul` devDependency is present either.

```json
// package.json (current)
"scripts": { "start": "node src/app.js", "test": "node --test src/" }
```

This is a **process/tooling gap**, not a code gap: the tests may well exercise
most lines (see "Static coverage inference" below), but there is no
instrumented, verifiable measurement, so the coverage quality gate is
NOT-EVALUABLE and cannot be scored as PASS.

## Files Needing Instrumented Coverage

| File | Has tests? | Static line-coverage inference (not a substitute for real coverage) |
|------|-----------|------------------------------------------------------------------|
| `src/app.js` | Yes (`src/app.test.js`, 21 tests) | By manual inspection, every branch in `priceWidget` and the `/price/bulk` handler appears to be exercised by at least one test (guard clauses, cap, malformed-token paths, success paths) — **except** the `Infinity`-value path identified in `EDGE_CASE_REVIEW.md`, which takes the success branch (`res.json({total: ...})`) but was never asserted, so its actual output (`{total:null}`) was never verified by a test. |
| `src/app.test.js` | N/A (is the test file) | N/A |

**No files have zero test coverage** — this is a 2-file repository and both
the sole implementation file and its logic paths are touched by the existing
suite. The gap here is *depth/precision* of assertions on certain paths, not
*breadth* of untouched files.

## Recommendation (process, not code)

This is a **tooling/process recommendation only** — per the QA role's decision
framework, "coverage threshold modifications" and test-framework changes are
escalation-required, not autonomous reviewer actions. This review does not
modify `package.json` or any gate config.

- Enable Node's built-in coverage collector so future qa-test-execution runs
  produce a real, evaluable coverage number:
  ```json
  "scripts": { "test": "node --experimental-test-coverage --test src/" }
  ```
  This requires no new dependency (built into Node ≥ 18.15) and would let the
  next qa-test-execution iteration populate `coverage` in its metadata instead
  of `null`, making the coverage gate evaluable again.
- This change is a **human/maintainer decision** (it alters the test script
  and would need a matching gate-threshold policy decision), so it is called
  out here as guidance for iteration 4, not applied by this review.
