# Gap Analysis — dev-review iteration 4
## Date: 2026-10-13T23:21:07.068Z
## Repository: hershbhargava/cw-test-brownfield · Issue #1 ("Add bulk pricing endpoint")

## Review Context

**Implementation Type**: `NEW_FEATURE` (documentation-propagation remediation on top
of an already-shipped feature). The `GET /price/bulk` feature itself was built,
tested, and merged in prior iterations (dev iteration 3 / arch iteration 5); this
iteration (dev/iteration-4) made **documentation-only** changes to close 3 gaps
raised by `arch-review/iteration-4`.

**Scope**: `DOCUMENTATION`, `API` (contract docs), `SECURITY` (threat-model docs).
No `DATABASE`, `UI`, `CACHING`, `INTEGRATION`, or source-code scope — confirmed by
`git diff` equivalent (dev iteration-4 commit `5f8b885` touched only 3 Markdown
files under `docs/design/technical/`, plus its own external-memory artifacts).

**Developer Artifacts Read**:
- `dev/iteration-4/IMPLEMENTATION_SUMMARY.md` — read first, as directed.
- `dev/iteration-4/GAP_FIXES_SUMMARY.md`
- `dev/iteration-4/metadata.json`
- `dev/iteration-4/IMPLEMENTATION_PLAN.md` (referenced, not re-quoted below)

**Verification Phases Selected** (adaptive, per detected scope):
- Phase 2 Requirements Verification — ALWAYS (ran)
- Phase 3 Scope-specific: **API** contract verification, **Security** verification,
  **Documentation** verification — ran (match detected scope)
- Phase 3 Scope-specific: Database, UI, Caching, Integration — **skipped** (no such
  scope in this delta; confirmed absent per TDD §7/§D5/§D8)
- Phase 4 Testing Verification — ALWAYS (ran; full suite executed, not just
  lightweight checks — see note below)
- Phase 5/6 Gap Analysis, Fixes, Commit — ALWAYS (this document + actions taken)

**Note on test execution**: the developer workflow's policy restricted iteration-4
to lightweight checks (`node --check`, no full suite) because "that's
qa-test-execution-workflow's job." This reviewer role has no such restriction and
the Testing Verification phase explicitly requires confirming "all tests passing" —
so the full suite (`npm test` and `npm run test:coverage`) was executed as part of
this review. Results below.

---

## Verification of the 3 Gaps Claimed Fixed by dev/iteration-4

### GAP-DIFF-001 (arch-review, HIGH) — SYSTEM_ARCHITECTURE.md three-endpoint ripple
- **Document Reference**: `arch-review/iteration-4/GAP_ANALYSIS.md:34-44`
- **Claimed fix** (`dev/iteration-4/GAP_FIXES_SUMMARY.md:9-32`): §1 "two→three"
  endpoints; §3 diagram gets a `/price/bulk` box + second `priceWidget` call edge;
  §4 gets a bulk request-flow subsection; §5 gets the finiteness-guard bullet.
- **Verification performed**: read `docs/design/technical/SYSTEM_ARCHITECTURE.md`
  in full (141 lines).
  - §1 (line 9): now reads "three HTTP `GET` endpoints" and enumerates `/health`,
    `/price`, `/price/bulk`. ✅ Matches claim.
  - §3 (lines 39-62): ASCII diagram now shows three boxes (`GET /health`,
    `GET /price`, `GET /price/bulk`) with both `/price` and `/price/bulk` wired to
    `priceWidget`; prose explicitly states "now has **two callers**." ✅ Matches.
  - §4 (lines 75-95): new `### GET /price/bulk?items=qty:unit,...` subsection with
    a 5-step flow (presence → cap → per-token shape/finiteness → priceWidget →
    aggregate overflow guard) mirroring the existing `/price` subsection's style.
    ✅ Matches.
  - §5 (lines 104-108): finiteness-guard bullet present, correctly scoped
    ("`NaN` is intentionally left to pass through"). ✅ Matches.
  - Cross-checked against `src/app.js:1-71` line-for-line: diagram and flow
    description are accurate to the actual code (e.g., the 50-item cap, the
    per-token `:` split, the running-sum `Number.isFinite` re-check).
- **Status**: ✅ **FIXED** (verified, not just claimed)
- **Priority**: HIGH (was) → resolved

### GAP-DIFF-002 (arch-review, MEDIUM) — API_CONTRACTS.md stale status banner
- **Document Reference**: `arch-review/iteration-4/GAP_ANALYSIS.md:48-57`
- **Claimed fix**: banner changed from "Designed (not yet implemented)" to
  "Implemented and shipped (issue #1, iteration 4)."
- **Verification performed**: read `docs/design/technical/API_CONTRACTS.md` in
  full (140 lines). Line 77 now reads exactly the claimed banner text, with a
  citation to `src/app.js:32-71` and `src/app.test.js`. Confirmed
  `grep -rn "not yet implemented"` across `docs/` returns **zero matches** — the
  phrase is fully gone, not just edited in this one spot.
- **Status**: ✅ **FIXED** (verified)
- **Priority**: MEDIUM (was) → resolved

### GAP-DIFF-003 (arch-review, MEDIUM) — SECURITY_DESIGN.md stale threat table
- **Document Reference**: `arch-review/iteration-4/GAP_ANALYSIS.md:61-70`
- **Claimed fix**: "Input validation" row Minimal→Partial; "Rate limiting/DoS" row
  None→Partial; "Authentication" row updated to list all three routes; new
  bounded-amplification observation added.
- **Verification performed**: read `docs/design/technical/SECURITY_DESIGN.md` in
  full (54 lines).
  - Line 18 (Authentication): "all three routes (`/health`, `/price`,
    `/price/bulk`)". ✅
  - Line 21 (Input validation): "Partial" — documents the finiteness guard on
    both endpoints plus bulk's per-token/cap/overflow guards, and correctly scopes
    the `NaN` passthrough as `/price`-only. ✅
  - Line 24 (Rate limiting/DoS): "Partial (request-shape bound only)" — cites
    `MAX_BULK_ITEMS = 50` at `src/app.js:31` (verified: `MAX_BULK_ITEMS = 50` is
    indeed on line 31). ✅
  - Lines 41-49 (Attack-relevant observations): bounded-amplification bullet
    present; `NaN`-passthrough bullet correctly scoped to `/price` only. ✅
- **Status**: ✅ **FIXED** (verified)
- **Priority**: MEDIUM (was) → resolved

**Conclusion on the 3 claimed fixes**: all three are genuinely and accurately
fixed, not merely marked fixed. No regressions introduced (diffed mentally against
the pre-iteration-4 state captured in `arch-review/iteration-4/GAP_ANALYSIS.md`'s
quoted "before" text — every "before" quote is gone from the live files).

---

## New Gap Found (NOT previously flagged by arch-review or dev iteration-4)

### Gap ID: GAP-DEPLOY-001
**Status**: [NEW] NEW ISSUE (found by this review, not carried over)
**Category**: Documentation / Consistency with Base (same failure family as
GAP-DIFF-001..003, but in a 4th sibling doc neither review touched)
**Priority**: MEDIUM
**Document Reference**: `docs/design/technical/DEPLOYMENT_STRATEGY.md` (pre-fix
lines 26-27, "Test" section)
**Requirement**: `TDD.md` §1 nominates `DEPLOYMENT_STRATEGY.md` as the "build/run/
test" detailed view; `TDD.md` §D9 (Testing Strategy) describes an HTTP-driven test
harness (`withServer`) added for issue #1, used by the large majority of the 39
tests.
**Expected**: An accurate description of the current test composition in the
document `TDD.md` nominates as authoritative for testing strategy.
**Actual (before this review's fix)**: `DEPLOYMENT_STRATEGY.md`'s "Test" section
read: *"Coverage: unit tests target the `priceWidget` pure function only
(`src/app.test.js`). There are no HTTP/integration tests."* This was true at TDD
iteration 1 (pre-issue-#1 baseline) but is now **factually false**: `src/app.test.js`
contains a `withServer` HTTP harness (lines 19-31) that binds the real Express
`app` to an ephemeral port and drives 36 of the 39 tests via `fetch()` against
`/health`, `/price`, and `/price/bulk` — i.e., the large majority of the suite now
**is** HTTP/integration testing. Only 3 tests (the original `priceWidget` unit
tests) match the old claim.
**Status**: 🐛 INCORRECT → ✅ **FIXED** (by this reviewer, during this iteration)
**Impact**: Low-to-medium. Doesn't affect runtime behavior or security posture, but
is the same class of defect the arch-review review-mode exists to catch: a reader
who trusts `DEPLOYMENT_STRATEGY.md` in isolation (as `TDD.md` §1 invites) would
wrongly conclude there is no HTTP-level test coverage for the three live routes,
understating the actual test rigor (39 tests, 100% line / 96.55% branch coverage,
independently re-verified below).
**Fix Applied** (`docs/design/technical/DEPLOYMENT_STRATEGY.md`, "Test" section):
Replaced the stale sentence with an accurate count (3 unit + 36 HTTP/integration
via the `withServer` harness), a citation to `TDD.md` §D9, and the actual coverage
numbers (100% line / 96.55% branch / 100% function), including an explanation of
the one uncovered branch (`require.main === module` entrypoint guard).
**Verification**: re-read the file after the edit; the new text is accurate against
`src/app.test.js` (counted: 3 top-level `priceWidget`-only tests at lines 6-14,
remaining 36 all wrapped in `withServer`) and against the coverage run performed
for this review (see Testing Verification below).
**Gate-integrity note**: this is a one-paragraph prose correction in a Markdown
file. No test, coverage threshold, lint rule, or CI gate was touched.

---

## Requirements Verification (PRD §7 Functional Requirements vs. code)

All FR-1..FR-9 and FR-BULK-1..FR-BULK-7 cross-checked directly against
`src/app.js` (not merely against the PRD's own citations):

| Requirement | PRD ref | Code location | Status |
|---|---|---|---|
| FR-1 Pricing formula | §7 | `src/app.js:17` | ✅ IMPLEMENTED |
| FR-2 Volume discount (10% at ≥100) | §7 | `src/app.js:16` | ✅ IMPLEMENTED |
| FR-3 Quantity guard (`qty<=0` throws) | §7 | `src/app.js:15` | ✅ IMPLEMENTED |
| FR-4 Finiteness guard (`±Infinity` throws, `NaN` passes) | §7 | `src/app.js:10-14` | ✅ IMPLEMENTED |
| FR-5 `/price` param coercion | §7 | `src/app.js:23` | ✅ IMPLEMENTED |
| FR-6 `/price` response format | §7 | `src/app.js:24-25` | ✅ IMPLEMENTED |
| FR-BULK-1 `items` presence check | §7 | `src/app.js:37-39` | ✅ IMPLEMENTED |
| FR-BULK-2 50-item cap | §7 | `src/app.js:31,41-43` | ✅ IMPLEMENTED |
| FR-BULK-3 token shape (`qty:unit`) | §7 | `src/app.js:46-49` | ✅ IMPLEMENTED |
| FR-BULK-4 per-field finiteness | §7 | `src/app.js:54-56` | ✅ IMPLEMENTED |
| FR-BULK-5 per-line pricing via priceWidget | §7 | `src/app.js:57` | ✅ IMPLEMENTED |
| FR-BULK-6 running-sum overflow guard (Q2a) | §7 | `src/app.js:63-65` | ✅ IMPLEMENTED |
| FR-BULK-7 all-or-nothing, final rounding | §7 | `src/app.js:67` | ✅ IMPLEMENTED |
| FR-8 `/health` liveness | §7 | `src/app.js:21` | ✅ IMPLEMENTED |
| FR-9 unknown routes → 404 | §7 | (no handler; Express default) | ✅ IMPLEMENTED, test-locked (`app.test.js:212-222`) |

**0 missing, 0 incorrect functional requirements.** The PRD's own "Documented
current edge behavior" callouts (NaN→null on `/price` only; unvalidated `unit`
sign) were independently verified as present and intentional (code comments at
`src/app.js:7-9` and TDD §9.2/§D3).

---

## API Contract Verification (API_CONTRACTS.md vs. code, line-by-line)

- `/health` contract (§1): matches `src/app.js:21` exactly.
- `/price` contract (§2), including the two `400` error strings and the
  documented `NaN→null,200` edge case: matches `src/app.js:22-26` exactly.
- `/price/bulk` contract (§3), all 5 `400` error strings
  (`items is required`, `too many items (max 50)`, `invalid item '<token>'`,
  `qty must be positive`, `total is too large`): each string cross-checked
  character-for-character against `src/app.js:38,42,48/55,15(via priceWidget),64`.
  All match. The worked examples in §3 (`10:2,100:2`→`200`, etc.) were
  independently recomputed by hand and match.
- Undefined-routes behavior (API_CONTRACTS §"Undefined routes"): confirmed by
  the `for (const method of ['POST','PUT','DELETE'])` test block
  (`src/app.test.js:212-222`) — 6 tests, all passing.

**0 contract mismatches found.**

---

## Security Verification (SECURITY_DESIGN.md vs. code)

- Confirmed via code inspection, not just the doc's own claims:
  - No auth/authz middleware anywhere in `src/app.js` — matches "None" rows.
  - No `cors`, `helmet`, or security-header middleware — matches.
  - `MAX_BULK_ITEMS = 50` is a real, enforced constant (`src/app.js:31,41-42`),
    not just documentation — matches the "Partial (request-shape bound only)"
    DoS row.
  - Error responses use only `e.message` (`src/app.js:25,69`), never `e.stack` or
    the raw exception — no stack-trace leak to clients. This is a positive
    finding not explicitly called out in `SECURITY_DESIGN.md`; not a gap (the doc
    doesn't claim otherwise), but worth noting in `SECURITY_AUDIT.md`.
  - No `eval`, `Function(...)`, child-process, or filesystem calls anywhere in
    `src/app.js` — confirmed by full-file read; matches the "no injection sink"
    claim in `TDD.md` §D7.
  - No secrets/env reads (`grep -rn "process.env" src/` → no matches) — matches
    "N/A" secrets-management row.

**0 security-documentation mismatches found.** Full detail in `SECURITY_AUDIT.md`.

---

## Testing Verification (Phase 4 — ALWAYS)

Full suite executed for this review (not just the lightweight checks the
developer iteration was restricted to):

```
npm test            → 39/39 passing, 0 failing
npm run test:coverage →
  src/app.js      | 100.00 line | 96.55 branch | 100.00 funcs
  src/app.test.js | 100.00 line | 100.00 branch | 100.00 funcs
  all files       | 100.00 line | 98.67 branch | 100.00 funcs
```

- Matches the figures claimed in `PRD.md §3` and `dev/iteration-4/IMPLEMENTATION_SUMMARY.md`
  exactly (39 tests, 100% line, 96.55% branch on `src/app.js`).
- The single uncovered branch is the `require.main === module` guard
  (`src/app.js:74`) — correctly identified by the PRD as "not exercised under
  test" since tests `require()` the module rather than execute it directly. This
  is expected, not a defect (it would require spawning a child process to cover,
  which is disproportionate for one guard line).
- Test quality: tests assert on behavior (status + full JSON body via
  `assert.deepStrictEqual`), not implementation details; cover happy path, all
  documented error paths, and multiple boundary conditions (exactly-50 cap,
  qty=99 vs 100 discount threshold, adjacent/trailing delimiters, overflow via
  both per-line and aggregate paths). No flaky constructs observed (ephemeral
  port + proper `try/finally` server teardown in `withServer`).

**0 testing gaps found.**

---

## Code Quality Observations (not gaps — see `CODE_QUALITY_REPORT.md`)

- **LOW, informational, already justified in TDD**: `/price/bulk`'s handler
  contains inline parsing/looping/guard logic rather than an extracted
  `parseItems` helper (Node.js review-lens: "no business logic in route
  handlers"). `TDD.md §D4` "Layering note" explicitly considered and accepted
  this: *"no new routes/controllers/services layering is introduced for a single
  additive handler... If the file grows, extracting a small `parseItems` helper
  is acceptable but not required."* Not re-raised as a gap here since it was a
  deliberate, documented architectural decision, not an oversight — consistent
  with the single-file style of the rest of the codebase (`priceWidget` is
  already the sole extracted function).

---

## Gap Count Summary

| Priority | Found this iteration | Fixed this iteration | Remaining |
|----------|----------------------|----------------------|-----------|
| CRITICAL | 0 | 0 | 0 |
| HIGH | 0 (1 carried from arch-review, now verified fixed) | 1 (verified) | 0 |
| MEDIUM | 1 new (GAP-DEPLOY-001) + 2 carried (verified fixed) | 3 | 0 |
| LOW | 0 (1 code-quality observation, not a gap) | — | 0 |
| **Total** | **1 new** | **3 verified/applied** | **0** |

### By Category
- Database: 0 (not applicable — no persistence in this service)
- API: 0 (contracts verified accurate)
- Core Algorithm: 0 (`priceWidget` + bulk handler verified against TDD pseudocode)
- Caching: 0 (not applicable)
- Security: 0 (threat table verified accurate post-fix)
- Edge Cases: 0 (overflow, boundary, delimiter cases all tested and passing)
- Performance: 0 (see `PERFORMANCE_REVIEW.md`)
- Documentation: 1 found and fixed (GAP-DEPLOY-001)
- Integration: 0 (not applicable)
- Testing: 0 (39/39 passing, coverage matches claims)
