## 📋 PRD DIFF Iteration 2 — Add bulk pricing endpoint

**Mode**: New Feature / Bug Fix
**Issue**: #1
**Branch**: `feature/issue-1`

### What this iteration covers

Specifies a new, additive `GET /price/bulk?items=qty:unit,qty:unit` endpoint that returns the summed discounted total across line items by reusing the existing `priceWidget` logic — plus the required tests. Existing `/price` and `/health` are untouched.

### Key decisions

- Reuse `priceWidget` as-is (10% off at qty ≥ 100, per line) — no new discount tiers; discount applies per line, then sum.
- Additive & backward-compatible: one new route, no API versioning, no data/schema/auth changes.
- Scoped IN: bulk endpoint, per-line discount, invalid-line rejection, tests. Scoped OUT: persistence, auth, rate limiting, config, observability (unchanged from PRD §6).

### Open questions for the reviewer

- Q1 (HIGH): response envelope — plain `{ "total": <sum> }` or richer per-line breakdown?
- Q2 (HIGH): invalid/malformed line handling — reject whole request `400` vs skip; reject `NaN` or mirror `/price`'s `NaN → null` pass-through?
- Q3 (MEDIUM): cap max number of line items (bounded `items` / DoS surface)?

### Files in this iteration

- `docs/requirements/PRD_DELTA_issue-1.md` — full change spec (10 sections)
- `external-memory/prd/iteration-2/metadata.json` — machine-readable metrics
- `external-memory/prd/iteration-2/GITHUB_COMMENT.md` — this comment

### Next step

Run prd-reviewer-workflow to validate this iteration, then architect handoff. Q1/Q2 should be answered before/at architecture phase since they pin the endpoint contract.
