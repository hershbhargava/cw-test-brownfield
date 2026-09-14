## 📋 PRD Iteration 1 — Bug1 live-test: numeric issueNumber

**Mode**: New Feature / Bug Fix — **Questionnaire** (no PRD delta yet)
**Issue**: #2
**Branch**: `feature/issue-2`

### What this iteration covers

The issue is a live-test placeholder (title *"Bug1 live-test: numeric issueNumber"*,
body *"live-test #120c bug 1"*) with no defect description, expected/actual behavior,
or repro. Coverage is ~10%, so **no PRD delta was authored** — instead a clarifying
questionnaire was generated so the real "Bug 1" can be defined.

### Key decisions

- Routed to **Questionnaire mode**: no answered questionnaire for issue #2 and no existing `PRD_DELTA_issue-2.md`.
- Grounded questions in the current code: `GET /health`, `GET /price`, and `GET /price/bulk` (`src/app.js`), plus documented edge behaviors (NaN → `{ total: null }`, negative `unit` accepted).
- Did NOT modify `PRD.md` or create a PRD delta (questionnaire mode only).

### Open questions for the reviewer

- **Q1 (HIGH)** — What is the actual defect, and on which endpoint?
- **Q2/Q3 (HIGH)** — Expected vs. actual behavior and exact repro request?
- **Q4 (HIGH)** — Is "numeric issueNumber" the bug, or just live-test metadata?

### Files in this iteration

- `docs/requirements/PRD_DELTA_issue-2-QandA.md` — clarifying questionnaire (10 questions, 4 assumptions)
- `external-memory/backlog/iteration-1/metadata.json` — machine-readable metrics
- `external-memory/backlog/iteration-1/GITHUB_COMMENT.md` — this comment

### Next step

Answer at least Q1–Q4 (HIGH) in `PRD_DELTA_issue-2-QandA.md`, then re-run. If this is
a pure live-test artifact, mark Q1/Q4 accordingly to close without a code change.
