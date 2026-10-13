# TDD_DELTA Gap Analysis — Iteration 4

**Reviewed document**: `docs/design/TDD.md` — Architecture Delta §D1–D11 (Issue #1: Add Bulk Pricing Endpoint)
**Reference documents**: `docs/requirements/PRD_DELTA_issue-1.md`, `docs/design/technical/{SYSTEM_ARCHITECTURE,API_CONTRACTS,SECURITY_DESIGN,DEPLOYMENT_STRATEGY}.md`, `src/app.js`, `src/app.test.js`
**Review mode**: TDD_DELTA (first arch-review pass)

---

## Summary

The TDD_DELTA itself (§D1–D11 in `TDD.md`) is accurate, complete, and traceable
against the shipped code — every design decision (D3/Q1–Q6), the handler pseudocode
(D4), the finiteness-guard ripple (D2a), and the risk table (D10) match
`src/app.js` and `src/app.test.js` line-for-line. **No functional/architectural
design gaps were found in the primary TDD_DELTA document.**

The gaps found are all of the same kind: **the TDD_DELTA correctly identifies and
designs the change, but the ripple onto the sibling "detailed view" documents that
`TDD.md` itself delegates to (§1 of `TDD.md`: "Detailed views live under
`docs/design/technical/`") was not fully propagated.** This matters because a
reader who opens `SYSTEM_ARCHITECTURE.md` or `API_CONTRACTS.md` directly — without
reading the TDD_DELTA first — gets a stale or self-contradictory picture of the
system. This is exactly the "Change Completeness" and "Consistency with Base"
failure mode this review mode is designed to catch.

Notably, the prior architect self-review (`work-in-progress/issue-1/external-memory/arch/iteration-5/metadata.json`)
asserted *"API_CONTRACTS §3 error strings match code... No gaps, inconsistencies,
or stale API contract found."* That check verified the **error-string content**
but missed the **status banner** at the top of the same section, which is the
subject of GAP-DIFF-002 below.

---

### Gap ID: GAP-DIFF-001
**Status**: [NEW] NEW ISSUE
**Category**: Change Completeness / Consistency with Base
**Priority**: HIGH
**PRD_DELTA Requirement**: N/A directly — this is a documentation-ripple gap, not a missing functional requirement. The functional requirement (FR-BULK-1, "Bulk endpoint") is itself correctly implemented and described in the TDD_DELTA.
**TDD_DELTA Coverage**: `docs/design/TDD.md` §1 states `SYSTEM_ARCHITECTURE.md` is the detailed view for "module layout, request flow, process model," and the TDD_DELTA (§D2) explicitly calls out "Route registration on the single `app` instance... **Extended.**" However, the living `docs/design/technical/SYSTEM_ARCHITECTURE.md` document was **not updated** to reflect this extension:
  - §1 Overview (line 9) still reads: *"It exposes two HTTP `GET` endpoints for a liveness check and for computing a discounted widget price."* — `/price/bulk` (the third endpoint, now shipped) is not mentioned at all.
  - §3 Component Boundaries diagram (lines 37–49) only shows two boxes, `GET /health` and `GET /price`; there is no `GET /price/bulk` box and no arrow into `priceWidget` from a third caller, even though `priceWidget` is now called from two routes instead of one.
  - §4 Request Flow (lines 58–71) documents the `/price` and `/health` flows step-by-step but has no corresponding `### GET /price/bulk?items=...` subsection, despite the bulk handler having materially more steps (token parsing, two-layer finiteness guard, aggregate-overflow guard) than either existing flow.
**Impact**: A reader who consults `SYSTEM_ARCHITECTURE.md` in isolation (the document `TDD.md` itself nominates as the authoritative module/request-flow reference) will conclude the service has only two endpoints and will not learn that `priceWidget` now has two callers. This undermines the "detailed views" delegation model the TDD relies on and is a genuine ripple effect that D2's "Existing Architecture Context" table did not extend into the living document it references.
**Fix Required**: Update `SYSTEM_ARCHITECTURE.md` §1 to say "three HTTP `GET` endpoints," add a `GET /price/bulk` box (and its call edge into `priceWidget`) to the §3 diagram, and add a `### GET /price/bulk?items=...` subsection to §4 mirroring the step-by-step style already used for `/price`.

---

### Gap ID: GAP-DIFF-002
**Status**: [NEW] NEW ISSUE
**Category**: API Contract Changes / Consistency
**Priority**: MEDIUM
**PRD_DELTA Requirement**: §5.3 "API impact... Additive only"; TDD_DELTA §D4 claims "full contract added to `technical/API_CONTRACTS.md` §3."
**TDD_DELTA Coverage**: The TDD_DELTA's claim is **only partially true**. The request/response shapes, error strings, and worked examples added to `API_CONTRACTS.md` §3 (lines 84–115) are accurate and match `src/app.js` exactly (verified). However, the **status banner directly above that content** (`API_CONTRACTS.md` line 77) still reads:
  > "**Status**: Designed (not yet implemented). Contract fixed by the architecture delta in `../TDD.md`..."
  This directly contradicts (a) `TDD.md` §D11: *"...as of iteration 4. Implementation-complete and documented,"* (b) `PRD_DELTA_issue-1.md`'s own header: *"`GET /price/bulk` is now **implemented and shipped**... (39 runtime tests, 100% line coverage),"* and (c) the actual code in `src/app.js:32-71` plus the 20+ passing tests for the route in `src/app.test.js`.
**Impact**: `API_CONTRACTS.md` is self-contradictory — a correct contract body sits under an incorrect "not yet implemented" banner. Anyone trusting the banner (the most prominent line in the section) would wrongly conclude the endpoint doesn't exist yet, or would distrust the otherwise-accurate contract below it. This is the kind of stale-status defect a "Living Documents" review mode exists specifically to catch, and it was missed by the previous architect self-review iteration (`arch/iteration-5`), which checked error-string content but not the status line.
**Fix Required**: Change the `API_CONTRACTS.md` §3 status banner to reflect shipped status, e.g.: *"**Status**: Implemented and shipped (issue #1, iteration 4). Contract below matches `src/app.js:32-71` and is verified by `src/app.test.js`."*

---

### Gap ID: GAP-DIFF-003
**Status**: [NEW] NEW ISSUE
**Category**: Security Impact / Consistency with Base
**Priority**: MEDIUM
**PRD_DELTA Requirement**: §5.5 Performance impact / §9 Security NFR: *"The 50-item cap and finiteness guards bound the bulk DoS surface."* TDD_DELTA §D7 "Security Impact" performs this analysis at the TDD level (new surface = unbounded `items`, mitigated by the 50-item cap; "no `eval`... no injection sink").
**TDD_DELTA Coverage**: The analysis in `TDD.md` §D7 is itself sound. But the living `docs/design/technical/SECURITY_DESIGN.md` — the document `TDD.md` §1 nominates as *"the (minimal) security posture that exists"* — was not updated to reflect either new control introduced by this delta:
  - The "Threat Surface" table's `Input validation` row (line 21) still reads: *"**Minimal** | Only `qty > 0` is enforced (via `priceWidget`)."* This is now inaccurate/incomplete: `priceWidget` also enforces the new finiteness guard (D2a) on **both** endpoints, and `/price/bulk` additionally enforces per-token finiteness, a 50-item cap, and an aggregate-overflow guard — none of which appear in this table.
  - The "Rate limiting / DoS" row (line 24) still reads *"**None** | No throttling middleware"* with no mention of the new 50-item cap, which TDD §D7/D10 itself identifies as the mitigation for a newly-introduced "unbounded input" amplification vector on `/price/bulk`.
**Impact**: `SECURITY_DESIGN.md` is the document a security reviewer would read to understand the threat model; as written, it undersells the input-hardening work done in this delta (making the service look less validated than it is) and omits the one DoS-relevant control (`MAX_BULK_ITEMS = 50`) that this delta's own risk table (D10) calls out as a required mitigation for a MEDIUM-severity risk ("Unbounded `items` → CPU/memory amplification").
**Fix Required**: Update the `Input validation` row to mention the finiteness guard (both endpoints) and the bulk-specific per-token/aggregate guards; update the `Rate limiting / DoS` row (or add a new row) noting the `MAX_BULK_ITEMS = 50` cap as a request-shape-level bound on `/price/bulk`, with a cross-reference to `TDD.md` §D7/D10.

---

## Gaps Explicitly Considered and NOT Carried Forward

- **PRD-review GAP-DIFF-001 (FR-BULK numbering mismatch between `PRD.md` and `PRD_DELTA_issue-1.md`)** — confirmed via inspection that `TDD.md` D3's table keys its decisions to issue-level question IDs (Q1–Q6), not `FR-BULK-*` numbers, and no `FR-BULK-*` identifier appears anywhere under `docs/design/`. This PRD-layer inconsistency does not propagate into the architecture layer and is correctly out of scope for this review (confirmed independently, not merely taken on trust from the prior `arch/iteration-5` self-assessment).
- **DEPLOYMENT_STRATEGY.md having no bulk-specific content** — correct and expected. TDD_DELTA §D8 explicitly states "no new resource, dependency, or scaling change," and the living document is consistent with that (unchanged, as it should be). Not a gap.
- **`README.md` not reflecting the new endpoint** — checked and found to be already correctly updated (lists `/price/bulk`, the 50-item cap, and the all-or-nothing `400` behavior). Not a gap.

---

## Gap Count by Priority

| Priority | Count |
|----------|-------|
| CRITICAL | 0 |
| HIGH | 1 |
| MEDIUM | 2 |
| LOW | 0 |
| **Total** | **3** |
