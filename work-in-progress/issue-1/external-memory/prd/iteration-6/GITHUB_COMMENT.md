## 📋 PRD DIFF Iteration 6 — Add bulk pricing endpoint [refreshed via broker]

**Mode**: New Feature / Bug Fix
**Issue**: #1
**Branch**: `feature/issue-1`

### What this iteration covers

A review-follow-up pass that resolves the four gaps raised in PRD review iteration 4
against the iteration-5 delta. No new product behavior — `GET /price/bulk` is already
shipped and tested (39/39, 100% line coverage); this tightens the delta's accuracy and
cross-document consistency.

### Key decisions

- **GAP-DIFF-001 (HIGH) fixed**: the delta's Functional-Requirement IDs now **reuse
  `PRD.md` §7's authoritative `FR-BULK-1..7` numbering verbatim** (so "FR-BULK-6" means
  the same requirement in both docs). The two delta-only items are relabeled
  `FR-BULK-8` (umbrella) / `FR-BULK-9` (tests) and explicitly marked *delta-proposed*;
  §10.2 no longer claims `PRD.md` already "gains" them.
- **GAP-DIFF-002 (MEDIUM) fixed**: NFR subsection retitled "New / extended
  non-functional considerations" — consistent with "Modified features: 0".
- **GAP-DIFF-003 (LOW) fixed**: rollback plan now names the real 4-commit range
  (`fcd74b2`..`e6e6a8d`) with a caveat that `2257de0` also touches shared `priceWidget`.
- **GAP-DIFF-004 (LOW) fixed**: the five `/price/bulk` error strings are now declared
  part of the contract (asserted verbatim by `src/app.test.js`).

### Open questions for the reviewer

- None. All six prior open questions remain RESOLVED against shipped code; the four
  review gaps are now closed.
- **Follow-up for `PRD.md` owner (not blocking)**: fold `FR-BULK-8`/`FR-BULK-9` into
  `PRD.md` §7 on its next refresh so the two docs stay in lockstep.

### Files in this iteration

- `docs/requirements/PRD_DELTA_issue-1.md` — full change spec (10 sections, ~3.5k words)
- `external-memory/prd/iteration-6/metadata.json` — machine-readable metrics
- `external-memory/prd/iteration-6/GITHUB_COMMENT.md` — this comment

### Next step

Re-run prd-reviewer-workflow (review iteration 5) to confirm GAP-DIFF-001..004 are
closed, then hand off to architect / implementation sign-off.
