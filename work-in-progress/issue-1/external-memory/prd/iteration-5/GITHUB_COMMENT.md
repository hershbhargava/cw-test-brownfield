## 📋 PRD DIFF Iteration 5 — Add bulk pricing endpoint [refreshed via broker]

**Mode**: New Feature / Bug Fix
**Issue**: #1
**Branch**: `feature/issue-1`

### What this iteration covers

Refreshes the PRD DIFF so it describes `GET /price/bulk` as **shipped** rather than
to-be-built. The stale iteration-2 delta still listed 6 OPEN questions; all are now
RESOLVED by the delivered code (`src/app.js`) and the baseline Q&A, and the delta now
documents the actual behaviour and guards.

### Key decisions

- Chose a **"describes-what-shipped"** framing over the old aspirational spec — code, tests (39 runtime, 100% line coverage), README, and TDDs are the source of truth.
- Resolved all 6 open questions: envelope `{ total }` (Q1), all-or-nothing `400` + stricter NaN/Infinity rejection (Q2), 50-item cap (Q3), `items is required` (Q4), delimiter/URL-encoding (Q5), round-once-at-end (Q6), plus the Q2a aggregate-overflow guard.
- Scoped IN: bulk endpoint, per-line discount reuse, input guards, tests. Scoped OUT (unchanged): per-line breakdown, auth, persistence, rate limiting, env config.

### Open questions for the reviewer

- None. All iteration-2 questions are RESOLVED against shipped code; `open_questions_count = 0`.

### Files in this iteration

- `docs/requirements/PRD_DELTA_issue-1.md` — full change spec (10 sections, ~16kB)
- `external-memory/prd/iteration-5/metadata.json` — machine-readable metrics
- `external-memory/prd/iteration-5/GITHUB_COMMENT.md` — this comment

### Next step

Run prd-reviewer-workflow to validate this refreshed iteration, then proceed to the
implementation/QA handoff (the feature is already implemented and green on
`feature/issue-1`).
