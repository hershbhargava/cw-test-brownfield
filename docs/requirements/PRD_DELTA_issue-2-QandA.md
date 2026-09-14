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

---

## ⚠️ Iteration 2 — Reconciliation required (BLOCKER: answers reference a non-existent endpoint)

> The iteration-1 answers were read as authoritative and I attempted to author
> `PRD_DELTA_issue-2.md`. **I could not**, because the answers describe a defect in
> an endpoint that does not exist in this repository. Writing the delta anyway would
> require inventing an entire widget-lookup feature (data store, route, response
> contract) — a NEW feature, which directly contradicts the answer's own
> *"Scope OUT: no new endpoints."* Per the rule *"Never assume — verify by reading
> actual code,"* this must be reconciled before a PRD delta can be written.
>
> **Ground truth** (verified `2026-09-14`): `src/app.js` registers exactly three GET
> routes — `/health` (line 21), `/price` (line 22), `/price/bulk` (line 32). A repo-wide
> search for `widgets`, `/widgets`, `findById`, `lookup`, and `not found` returns
> **zero** matches outside these three routes. There is no `GET /widgets/:id`, no
> widget store, and no truthy-on-lookup code anywhere in `src/`.

### Q11 — The answered defect targets `GET /widgets/:id`, which does not exist. How should we reconcile? *(HIGH — BLOCKER)*

- **Question**: The answer states *"`GET /widgets/:id` returns HTTP 200 with an empty
  body when `:id` is a numeric string that does not exist, instead of 404,"* with root
  cause *"a truthy check on the lookup result."* No such route, lookup, or widget store
  exists in `src/app.js`. Which of these is correct?
  - **(a)** Wrong repository / branch — the `/widgets/:id` endpoint lives elsewhere and
    this issue should target that codebase.
  - **(b)** The endpoint name is a mistake and the real defect is on an existing route
    (`/price`, `/price/bulk`, or `/health`) — if so, please restate it against that route.
  - **(c)** This is genuinely a NEW endpoint to be built (widget lookup by id) — in
    which case it is a feature, not a "bug fix," and the "no new endpoints" scope line
    must be removed.
  - **(d)** This is a pure live-test artifact and no code change is intended.
- **Why it matters**: A PRD delta cannot describe a fix to code that isn't there
  without fabricating the feature it supposedly fixes. This blocks the entire delta.
- **Suggested default**: [ASSUMPTION: (d) live-test artifact — do not author a delta
  or change code until the target endpoint is confirmed to exist.]
- **Source**: iteration-1 ANSWERS block above; `src/app.js:21,22,32` (only routes);
  repo-wide grep for `widgets`/`lookup` (no matches).
- **Answer**:

### Q12 — If the real defect is on an existing route, what is the corrected expected/actual? *(HIGH)*

- **Question**: If Q11 = (b), restate the defect against a real route. For reference,
  current documented behaviors are: `/price` returns `200 { "total": null }` for
  non-numeric input (NaN pass-through, `src/app.js:8`); `/price` and `/price/bulk`
  reject non-finite input with `400`; unknown routes already return Express's default
  `404` (`app.test.js:187`). Which of these, if any, is the "numeric issueNumber" bug?
- **Why it matters**: Redirects the fix to a real, testable surface so acceptance
  criteria can be grounded in the actual code.
- **Suggested default**: [ASSUMPTION: none — cannot map the described defect onto an
  existing route without operator input.]
- **Source**: `src/app.js`; `src/app.test.js:180,187`; `PRD.md` §7.
- **Answer**:

### Q13 — If (c) a new widget-lookup endpoint is intended, what is its full contract? *(HIGH, only if Q11=c)*

- **Question**: If a `GET /widgets/:id` endpoint is genuinely wanted, what is the
  source of widget data (there is currently no persistence — `PRD.md` §6, §10), the
  success response shape, and the not-found response? Note this reclassifies the work
  from bug fix to new feature.
- **Why it matters**: The current service is stateless with no data store; a lookup
  endpoint needs a defined data source, which is a substantial scope change.
- **Suggested default**: [ASSUMPTION: not intended — the service stays stateless and
  price-only.]
- **Source**: `PRD.md` §6 Out of Scope (persistence), §10 Constraints (no persistence).
- **Answer**:

> **Next step**: Answer **Q11** (and Q12 or Q13 as applicable), then re-run. Once the
> target endpoint is confirmed to exist in this repo (or the scope is corrected), the
> next iteration can author `PRD_DELTA_issue-2.md` grounded in real code.
