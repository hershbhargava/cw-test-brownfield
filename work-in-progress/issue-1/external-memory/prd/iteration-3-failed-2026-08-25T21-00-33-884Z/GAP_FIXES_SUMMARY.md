# Gap Fixes Summary — Issue #1, Iteration 3 (Developer)

Source gap ledger: architect TDD_DELTA review
`work-in-progress/issue-1/external-memory/prd/iteration-3-failed-2026-08-25T20-49-37-099Z/GAP_ANALYSIS.md`
(5 gaps: 0 CRITICAL, 0 HIGH, 2 MEDIUM, 3 LOW). All 5 addressed in this implementation.

| Gap ID | Priority | Status | Code change / verification |
|--------|----------|--------|-----------------------------|
| GAP-DIFF-001 | MEDIUM | ✅ FIXED | Test harness `withServer()` in `src/app.test.js:19` drives the real Express `app` on an ephemeral port (`app.listen(0)`) using Node 20's built-in global `fetch`, and closes the server in a `finally` block. **No new dependency** added (no `supertest`) — `package.json` is unchanged. Verified: 18 HTTP-level tests pass. |
| GAP-DIFF-002 | MEDIUM | ✅ FIXED | Type-guard `if (typeof raw !== 'string' || raw === '')` at `src/app.js:27` treats non-string `items` (repeated-param arrays, bracket objects) as missing → `400 { error: "items is required" }`, *before* any `.split`. Prevents `TypeError: raw.split is not a function` from being reflected to the caller. Verified by test `bulk: rejects repeated items param (non-string)` (`?items=10:2&items=100:2` → 400 "items is required"). |
| GAP-DIFF-003 | LOW | ✅ FIXED | `README.md:7` adds the `GET /price/bulk` row to the endpoint list, satisfying the PRD_DELTA §7 communication plan. |
| GAP-DIFF-004 | LOW | ✅ FIXED | Empty-token handling verified by two tests: `bulk: rejects adjacent delimiters` (`items=10:2,,100:2`) and `bulk: rejects trailing delimiter` (`items=10:2,`), both → `400 { error: "invalid item ''" }`. The `parts.length !== 2` guard at `src/app.js:37` handles this (empty token `''` → `['']`, length 1). |
| GAP-DIFF-005 | LOW | ✅ FIXED | Closed as a consequence of GAP-DIFF-002: the type-guard rejects non-string input before `.split`, so no internal JS runtime error text is reflected to the caller. Only the four documented, reviewed error strings are ever returned. |

## Notes
- All gaps were MEDIUM or LOW; no CRITICAL/HIGH gaps existed, so no blocking work.
- The fixes are drawn directly from the "Fix Required" guidance in each gap entry and
  do not deviate from the TDD_DELTA §D3 resolved contract.
