# Implementation Summary — Issue #1 (Iteration 3, QA-blocker fix pass)

## Objective
Remediate the QA Test Review iteration-3 blockers (verdict **72/100 REVIEW_AGAIN**):
fix the HIGH non-finite-input bug on `/price` and `/price/bulk`, add the required
regression tests, and enable coverage collection — all backward-compatible.

## Documents reviewed (key points)
- **special_instructions** (authoritative for this pass): HIGH Infinity bug + 6
  regression tests + `test:coverage` script; keep `/health`, `/price`, `priceWidget`
  backward-compatible.
- **API_CONTRACTS.md §"Error semantics"**: documents the legacy `/price` NaN →
  `{ total: null }, 200` passthrough — must be preserved (only Infinity is rejected).
- **TDD.md §D3/Q2**: `/price/bulk` is deliberately stricter than `/price` and rejects
  invalid numeric input — extending it to reject Infinity is consistent.

## Requirements met
| Requirement | Status | Evidence |
|---|---|---|
| HIGH: Infinity → 400 on `/price/bulk` (qty and unit tokens) | ✅ | `src/app.js:54`; tests `app.test.js:159,165` |
| HIGH: Infinity → 400 on `/price` | ✅ | `src/app.js:10-14`; test `app.test.js:171` |
| `/price` NaN → `{total:null},200` preserved | ✅ | `src/app.js` (NaN not rejected); test `app.test.js:180` |
| Bulk stays all-or-nothing 400 | ✅ | `src/app.js:54` |
| Unknown-route 404 test | ✅ | `app.test.js:187` |
| `qty=99` boundary (no discount) test | ✅ | `app.test.js:193` |
| Negative-unit behavior test | ✅ | `app.test.js:201` |
| Non-positive-qty error-message assertion | ✅ | `app.test.js:13` |
| `test:coverage` script (test unchanged) | ✅ | `package.json:9` |
| `/health`, `/price`, `priceWidget`, bulk normal paths unchanged | ✅ | 28/28 tests + empirical probes |

## Files modified
- `src/app.js` — finite-input validation: `priceWidget` rejects Infinity/-Infinity
  (not NaN, preserving `/price` passthrough); `/price/bulk` guard `Number.isNaN` →
  `!Number.isFinite`.
- `src/app.test.js` — +7 regression tests; strengthened 1 existing unit test's matcher.
- `package.json` — added `test:coverage` script (existing `test` unchanged).
- `package-lock.json` — reconciled (no dependency change; content unchanged).

## Test coverage
`node --test src/app.test.js` → **28 tests, 28 pass, 0 fail** (was 21).
`npm run test:coverage` → 28/28 pass + coverage report emitted (gate now evaluable).

## Gate integrity
No gate was modified, lowered, disabled, or skipped. The coverage gate is made
*evaluable* by ADDING a coverage script — the existing `test` gate is untouched and
no threshold was changed. All remediation was by adding tests / fixing code, per the
GATE-INTEGRITY rules.

## Known limitations / future work
- `/price` retains the documented NaN → `{ total: null }, 200` passthrough by design
  (only Infinity is now rejected). Changing that legacy behavior is out of scope for
  issue #1 and would be a separate product decision.
- Negative unit price remains accepted (unvalidated) — documented, not a new
  requirement.

## Conflicts resolved
- Artifacts written to `external-memory/prd/iteration-3/` per the active write-gate
  hook (#794), which supersedes the prompt's `dev/iteration-3` path.
