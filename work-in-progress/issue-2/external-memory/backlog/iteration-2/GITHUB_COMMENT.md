## 📋 PRD Iteration 2 — Bug1 live-test: numeric issueNumber

**Mode**: New Feature / Bug Fix — **Reconciliation questionnaire** (PRD delta BLOCKED)
**Issue**: #2
**Branch**: `feature/issue-2`

### What this iteration covers

The iteration-1 questionnaire was answered, so I attempted to author `PRD_DELTA_issue-2.md`.
**I could not**: the answers describe a defect in `GET /widgets/:id`, but that endpoint
**does not exist** in this repository. Writing the delta would mean inventing a whole
widget-lookup feature — which contradicts the answer's own *"no new endpoints"* scope.

### Key decisions

- **Verified against code**: `src/app.js` has only `/health` (L21), `/price` (L22), `/price/bulk` (L32). A repo-wide search for `widgets`/`lookup`/`findById` returns zero matches.
- **Did NOT fabricate** a PRD delta for a non-existent endpoint (rule: "never assume — verify by reading actual code").
- Added reconciliation questions **Q11–Q13** to `PRD_DELTA_issue-2-QandA.md`; preserved the operator's iteration-1 answers.

### Open questions for the reviewer

- **Q11 (HIGH — BLOCKER)** — `/widgets/:id` doesn't exist here. Is this (a) wrong repo/branch, (b) a mislabeled defect on a real route, (c) a genuinely new endpoint (= feature, not bug fix), or (d) a live-test artifact?
- **Q12 (HIGH)** — If (b), restate expected/actual against a real route (`/price`, `/price/bulk`).
- **Q13 (HIGH)** — If (c), define the new endpoint's data source and contract (service is currently stateless).

### Files in this iteration

- `docs/requirements/PRD_DELTA_issue-2-QandA.md` — answers preserved + Q11–Q13 reconciliation
- `external-memory/backlog/iteration-2/metadata.json` — status: blocked
- `external-memory/backlog/iteration-2/GITHUB_COMMENT.md` — this comment

### Next step

Answer **Q11** (and Q12/Q13 as applicable) to point the fix at a real code surface,
then re-run. Once reconciled, the next iteration can author the PRD delta grounded in
actual code.
