## 📋 PRD DIFF Iteration 3 — Bug1 live-test: numeric issueNumber

**Mode**: New Feature / Bug Fix — **PRD DIFF written, but BLOCKED**
**Issue**: #2
**Branch**: `feature/issue-2`

### What this iteration covers

The workflow moved to document mode and required `PRD_DELTA_issue-2.md`, so it was
written. But the blocker from iteration 2 is **still unresolved**: the authoritative
answers describe a bug in `GET /widgets/:id`, which **does not exist** in this repo, and
reconciliation questions **Q11–Q13 remain unanswered**. The delta therefore documents
the contradiction honestly and specifies **no fix** — fabricating one would mean
inventing a whole widget-lookup feature (contradicting the answer's own "no new endpoints").

### Key decisions

- **Verified again**: `src/app.js` has only `/health` (L21), `/price` (L22), `/price/bulk` (L32); grep for `widgets`/`findById`/`lookup` = 0 matches. Unknown routes already return 404 (`app.test.js:187`).
- **Wrote the required `PRD_DELTA_issue-2.md`** (all 10 sections) but as a truthful "cannot-specify" delta: §4 proposes no change, §5 impact = none, §9 carries the blocker.
- **Did NOT fabricate** a `/widgets/:id` fix (rules: verify against code; never make undocumented assumptions).

### Open questions for the reviewer

- **Q11 (HIGH — BLOCKER)** — `/widgets/:id` doesn't exist. Is this (a) wrong repo/branch, (b) mislabeled defect on a real route, (c) a new endpoint (= feature), or (d) live-test artifact?
- **Q12 (HIGH)** — If (b), restate the defect against `/price` or `/price/bulk`.
- **Q13 (HIGH)** — If (c), define the new endpoint's data source and contract (service is stateless).

### Files in this iteration

- `docs/requirements/PRD_DELTA_issue-2.md` — change spec (10 sections; status: blocked)
- `external-memory/backlog/iteration-3/metadata.json` — status: blocked
- `external-memory/backlog/iteration-3/GITHUB_COMMENT.md` — this comment

### Next step

Answer **Q11** (and Q12/Q13 as applicable) to point the fix at real code. Until then the
delta cannot specify a change and should not proceed to architect/dev.
