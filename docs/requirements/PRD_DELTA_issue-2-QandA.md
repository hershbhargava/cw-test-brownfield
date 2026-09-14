# PRD Delta — Clarifying Questions & Assumptions (issue #2)

> **Bug fix / small feature on an existing product** (`widget-service`).
> **Mode**: Questionnaire (first run). Coverage of the source issue is very low
> (~10%), so no PRD delta is authored yet. This document collects the answers
> needed before a `PRD_DELTA_issue-2.md` can be written.
>
> **Issue #2** — title: *"Bug1 live-test: numeric issueNumber"*; body: *"live-test
> #120c bug 1"*. The issue is a live-test placeholder: it names a "bug 1" but does
> not describe the defect, the expected vs. actual behavior, or how to reproduce it.
> The questions below reconstruct the missing context.
>
> **Sources reviewed**: `hershbhargava/cw-test-brownfield/issues/issue-2.json`
> (issue body/title), existing `docs/requirements/PRD.md`, `src/app.js`,
> `src/app.test.js`, `package.json`, `README.md`.
>
> **How to use this file**: fill the **Answer** column for each question, then
> re-run the workflow. Answered questions become authoritative requirements and the
> next iteration produces `PRD_DELTA_issue-2.md`.

---

## Priority legend

- **HIGH** — Blocks writing the PRD delta; must be answered before any design/dev.
- **MEDIUM** — Should be answered before development starts; affects scope or
  acceptance criteria.
- **LOW** — Can be resolved during development; nice-to-have clarity.

---

## Group A — Problem definition (what is "Bug 1"?)

### Q1 — What is the actual defect this bug report is about? *(HIGH)*

- **Question**: The issue titled "Bug1 live-test: numeric issueNumber" has only the
  body "live-test #120c bug 1". What is the concrete bug — what does the product do
  wrong today, and on which endpoint (`/health`, `/price`, or `/price/bulk`)?
- **Why it matters**: Without a defect description there is nothing to fix; the PRD
  delta cannot state a problem, scope, or acceptance criteria.
- **Suggested default**: [ASSUMPTION: this is a live-test placeholder with no real
  defect; if so, close as "no-op / test artifact" and no PRD delta is produced.]
- **Source**: `issues/issue-2.json` → `title`, `body`.
- **Answer**:

### Q2 — What is the expected behavior vs. the observed (actual) behavior? *(HIGH)*

- **Question**: For the affected endpoint, what response (status code + JSON body)
  do you expect, and what do you get instead?
- **Why it matters**: Expected-vs-actual is the core of a bug PRD and drives the
  acceptance test.
- **Suggested default**: [ASSUMPTION: none available — cannot infer expected behavior
  from the issue text.]
- **Source**: `issues/issue-2.json` → `body`; `src/app.js` current handlers.
- **Answer**:

### Q3 — What are the reproduction steps (exact request)? *(HIGH)*

- **Question**: What request reproduces the bug (method, path, query string, e.g.
  `GET /price?qty=...&unit=...` or `GET /price/bulk?items=...`)?
- **Why it matters**: A deterministic repro is required to write a failing test that
  the fix must turn green.
- **Suggested default**: [ASSUMPTION: no repro provided.]
- **Source**: `issues/issue-2.json`; `src/app.js` route surface.
- **Answer**:

### Q4 — Does "numeric issueNumber" in the title describe the bug, or is it test metadata? *(HIGH)*

- **Question**: The title mentions "numeric issueNumber". Does the bug concern a
  numeric input/parameter to the pricing API, or is "numeric issueNumber" just a
  label for this live-test run (i.e. the issue number is numeric)?
- **Why it matters**: It determines whether there is a real code change or this is a
  pipeline/test-harness validation with no product impact.
- **Suggested default**: [ASSUMPTION: it is test metadata (the issue number `2` is
  numeric) and not a description of a product defect.]
- **Source**: `issues/issue-2.json` → `title`, `body` ("live-test #120c").
- **Answer**:

---

## Group B — Scope of the fix

### Q5 — Which endpoint(s) are in scope for this fix? *(HIGH)*

- **Question**: Should the change touch `/price`, `/price/bulk`, `/health`, or a new
  route? Today the service exposes `GET /health`, `GET /price?qty=&unit=`, and
  `GET /price/bulk?items=qty:unit,...` (`src/app.js`).
- **Why it matters**: Defines the blast radius and which regression tests apply.
- **Suggested default**: [ASSUMPTION: no endpoint in scope until Q1–Q3 are answered.]
- **Source**: `src/app.js` lines 21–71; existing `PRD.md` §6, §14.2.
- **Answer**:

### Q6 — Is this a behavior change or a documented-behavior confirmation? *(MEDIUM)*

- **Question**: Several current behaviors are *documented but potentially surprising*:
  `/price` returns `200 { "total": null }` for non-numeric input (NaN pass-through,
  `src/app.js:8`, `app.test.js:180`); negative `unit` yields a negative total
  (`app.test.js:256`). Is "Bug 1" asking to change any of these, or to keep them?
- **Why it matters**: Changing a documented behavior is a contract change requiring
  updates to the PRD, tests, and consumers.
- **Suggested default**: [ASSUMPTION: keep all currently documented behaviors
  unchanged unless the bug explicitly targets one.]
- **Source**: `PRD.md` §7 "Documented current edge behavior"; `app.test.js:180`, `:256`.
- **Answer**:

### Q7 — What is explicitly OUT of scope for this fix? *(MEDIUM)*

- **Question**: Should the fix stay narrowly on the reported defect and avoid
  unrelated hardening (auth, rate limiting, observability, port config), which the
  existing PRD already lists as out of scope?
- **Why it matters**: Prevents scope creep and keeps the change reviewable.
- **Suggested default**: [ASSUMPTION: yes — fix only the reported defect; all items in
  `PRD.md` §6 "Out of Scope" remain out of scope.]
- **Source**: `PRD.md` §6 Out of Scope.
- **Answer**:

---

## Group C — Acceptance & quality

### Q8 — What is the acceptance criterion that proves the bug is fixed? *(HIGH)*

- **Question**: What single, testable condition confirms the fix (e.g. "a specific
  request now returns status X with body Y")?
- **Why it matters**: This becomes the acceptance test and the definition of done.
- **Suggested default**: [ASSUMPTION: a new `node:test` case asserting the corrected
  response, plus all existing tests in `src/app.test.js` still pass (`npm test`).]
- **Source**: `package.json` → `test`; `src/app.test.js` harness (`withServer`).
- **Answer**:

### Q9 — Must existing behavior/tests remain unchanged (no regressions)? *(MEDIUM)*

- **Question**: Can the fix be additive (new/adjusted logic + new test) with all
  current tests still green, or is a breaking change acceptable?
- **Why it matters**: The suite includes explicit regression and "documented
  behavior" locks (`app.test.js:137–205`); breaking them signals a contract change.
- **Suggested default**: [ASSUMPTION: additive, zero regressions — every existing
  test in `src/app.test.js` must still pass.]
- **Source**: `src/app.test.js` regression + documented-behavior tests.
- **Answer**:

### Q10 — Any constraints on dependencies or approach? *(LOW)*

- **Question**: Should the fix keep the current constraint of no new runtime
  dependencies (only `express`) and no build step, consistent with the existing
  service?
- **Why it matters**: Adding a dependency changes the deployment/testing footprint.
- **Suggested default**: [ASSUMPTION: no new dependencies; pure JS change within
  `src/app.js` and a test in `src/app.test.js`.]
- **Source**: `package.json` (sole dep `express ^4.19.2`); `PRD.md` §10 Constraints.
- **Answer**:

---

## Summary of assumptions (used only if unanswered)

| # | Assumption |
|---|------------|
| A1 | Issue #2 is a live-test placeholder with no real product defect (Q1, Q4). |
| A2 | No endpoint/behavior change is made until a concrete defect is described (Q2, Q3, Q5). |
| A3 | All currently documented behaviors and existing tests remain unchanged (Q6, Q9). |
| A4 | The fix, if any, is additive, dependency-free, and covered by a new `node:test` case (Q8, Q10). |

> **Next step**: Answer Q1–Q4 (HIGH) at minimum, then re-run. If the issue is a pure
> live-test artifact, mark Q1/Q4 accordingly and the workflow can close it without a
> code change.

---

## ANSWERS (operator, #175 live-test)

All questions answered — proceed to author `PRD_DELTA_issue-2.md`.

- **Defect**: `GET /widgets/:id` returns HTTP 200 with an empty body when `:id` is a **numeric string that does not exist**, instead of 404. Root cause: a truthy check on the lookup result treats `0`/empty as found.
- **Expected**: unknown id → **404** `{ "error": "not found" }`; existing id → 200 with the widget JSON.
- **Scope IN**: fix the lookup/return in `src/app.js`; add a regression test in `src/app.test.js`. **Scope OUT**: no schema/API-shape changes, no new endpoints.
- **Acceptance**: `GET /widgets/999999` → 404; `GET /widgets/<existing>` → 200; existing tests stay green; new test covers the numeric-miss case.
- **Backward compatibility**: fully backward compatible; no migration.
- **Priority/roll-out**: standard; no feature flag needed.
