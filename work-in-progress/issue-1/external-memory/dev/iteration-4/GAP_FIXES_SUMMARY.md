# Gap Fixes Summary — Iteration 4

Source: `work-in-progress/issue-1/external-memory/arch-review/iteration-4/GAP_ANALYSIS.md`
(0 CRITICAL, 1 HIGH, 2 MEDIUM, 0 LOW). All gaps are documentation-propagation
defects in sibling technical docs; the code and the primary TDD are already correct.

---

## GAP-DIFF-001 — [HIGH] — Change Completeness / Consistency with Base — FIXED

**Problem**: `docs/design/technical/SYSTEM_ARCHITECTURE.md` still described the
service as having only two `GET` endpoints, with no `/price/bulk` box in the §3
component diagram and no §4 request-flow subsection for the new route, even though
`priceWidget` now has two callers.

**Fix applied** (all in `docs/design/technical/SYSTEM_ARCHITECTURE.md`):
- §1 Overview: "two HTTP `GET` endpoints" → "three HTTP `GET` endpoints" and
  enumerated `/health`, `/price`, `/price/bulk` (with `../TDD.md` §D4 reference).
- §3 Component Boundaries: redrew the ASCII diagram to add a `GET /price/bulk` box
  with a call edge into `priceWidget`; changed "two Express route handlers" → "three"
  and added a note that `priceWidget` now has two callers (per-request vs. per-line,
  ≤ `MAX_BULK_ITEMS = 50`).
- §4 Request Flow: added a `### GET /price/bulk?items=qty:unit,...` subsection with
  the step-by-step flow (presence check → 50-item cap → per-token shape/finiteness
  → per-line `priceWidget` → running-sum overflow guard → rounded sum), mirroring
  the existing `/price` style.
- §5 Business Rule: added the finiteness guard (`±Infinity` → throw; `NaN`
  deliberately passed through) that `priceWidget` now enforces (`../TDD.md` §D2a).

**Verification**: `SYSTEM_ARCHITECTURE.md` now states three endpoints; grep confirms
`/price/bulk` appears in §1, §3 (diagram), §4 (flow). Matches `src/app.js:32-71`.

---

## GAP-DIFF-002 — [MEDIUM] — API Contract / Consistency — FIXED

**Problem**: `docs/design/technical/API_CONTRACTS.md` §3 status banner read
"Designed (not yet implemented)", contradicting `TDD.md` §D11 ("Implementation-
complete"), the PRD_DELTA header, and the shipped+tested code.

**Fix applied** (`docs/design/technical/API_CONTRACTS.md` §3 banner):
- Changed to "**Status**: Implemented and shipped (issue #1, iteration 4). The
  contract below matches `src/app.js:32-71` and is verified by the `/price/bulk`
  test cases in `src/app.test.js`." The accurate contract body below the banner was
  left unchanged (it was already correct).

**Verification**: banner now reads "Implemented and shipped"; the phrase "not yet
implemented" no longer appears in the file.

---

## GAP-DIFF-003 — [MEDIUM] — Security Impact / Consistency — FIXED

**Problem**: `docs/design/technical/SECURITY_DESIGN.md` threat-surface table did not
reflect the two input-hardening controls this delta introduced (the `priceWidget`
finiteness guard and the bulk `MAX_BULK_ITEMS = 50` cap).

**Fix applied** (`docs/design/technical/SECURITY_DESIGN.md`):
- "Input validation" row: **Minimal → Partial**; now documents `qty > 0`, the
  non-finite (`±Infinity`) guard on **both** endpoints (`../TDD.md` §D2a), and the
  bulk-specific per-token shape, per-field finiteness, 50-item cap, and running-sum
  overflow guard (`../TDD.md` §D3/§D7); clarifies the legacy `NaN` passthrough is
  `/price`-only.
- "Rate limiting / DoS" row: **None → Partial (request-shape bound only)**; now notes
  the `MAX_BULK_ITEMS = 50` cap (`src/app.js:31`) as the mitigation `../TDD.md`
  §D7/§D10 names for the MEDIUM "unbounded `items`" amplification vector.
- "Authentication" row: "both routes" → "all three routes (`/health`, `/price`,
  `/price/bulk`)".
- "Attack-relevant observations": added a bounded-bulk-amplification bullet and
  scoped the `NaN` passthrough observation to `/price` only (noting `/price/bulk`
  rejects `NaN`/non-finite with 400).

**Verification**: threat table rows now reference the finiteness guard and the
50-item cap with `../TDD.md` §D7/§D10 cross-references; consistent with `src/app.js`.

---

## Cross-check against REVIEW_SUMMARY.md

The arch-review `REVIEW_SUMMARY.md` recommendation was exactly: "a diagram/section
addition to `SYSTEM_ARCHITECTURE.md`, a one-line status-banner correction in
`API_CONTRACTS.md`, and two table-row updates in `SECURITY_DESIGN.md`." All three
are addressed. No code or test changes were required (and none were made), per the
review's finding of zero functional/design gaps.

## Gate integrity

No quality gate, coverage threshold, lint rule, or test script was modified,
lowered, or skipped. This iteration changed Markdown documentation only; existing
coverage (100% line, verified by `qa-test-execution-workflow`) is unaffected.
