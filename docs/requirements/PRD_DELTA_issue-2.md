# PRD DIFF — issue #2: "Bug1 live-test: numeric issueNumber"

> **Design mode**: New Feature / Bug Fix (PRD DIFF) · **Depth**: detailed · **Iteration**: 3
> **Status**: ⚠️ **BLOCKED — cannot specify the fix.** The authoritative answers
> describe a defect in an endpoint (`GET /widgets/:id`) that **does not exist in this
> repository**. This delta therefore documents the *blocker* and the *reconciliation
> needed*, and deliberately does **not** fabricate a fix for non-existent code.
>
> **Base product**: `widget-service` (see `docs/requirements/PRD.md`).
> **Sources**: issue `#2` (`.../issues/issue-2.json`); answered questionnaire
> `docs/requirements/PRD_DELTA_issue-2-QandA.md`; verified code `src/app.js`,
> `src/app.test.js` (read `2026-09-14`).

---

## 1. Change Summary

The stakeholder answers for issue #2 request a **bug fix**: make `GET /widgets/:id`
return **404 `{ "error": "not found" }`** for a numeric id that does not exist, instead
of the reported **200 with an empty body**.

**This change cannot be specified as written**, because `widget-service` has **no
`GET /widgets/:id` endpoint, no widget data store, and no lookup logic**. Verified in
`src/app.js`: the service registers exactly three GET routes — `/health` (line 21),
`/price` (line 22), `/price/bulk` (line 32) — and a repo-wide search for `widgets`,
`findById`, and `lookup` returns zero matches. Delivering the described fix would
require **building an entire widget-lookup feature** (a data source, a new route, and
a response contract), which is a new feature — directly contradicting the answer's own
scope line *"Scope OUT: … no new endpoints."*

- **Scope of this delta**: 0 changes specified (blocked); 1 unresolved blocker.
- **Priority / urgency**: Blocker must be resolved before any design or dev work.
- **Net delta to the product**: **None** until reconciliation (see §9).

---

## 2. Motivation & Background (bug report, as provided)

From the answered questionnaire (`PRD_DELTA_issue-2-QandA.md`, "ANSWERS" block):

- **Symptom (reported)**: `GET /widgets/:id` returns **HTTP 200 with an empty body**
  when `:id` is a numeric string that does not exist.
- **Expected (reported)**: unknown id → **404 `{ "error": "not found" }`**; existing id
  → **200** with the widget JSON.
- **Root cause (reported)**: "a truthy check on the lookup result treats `0`/empty as
  found."
- **Severity (reported)**: standard; backward compatible; no feature flag.
- **Link**: GitHub issue [#2](https://github.com/hershbhargava/cw-test-brownfield/issues/2)
  — title *"Bug1 live-test: numeric issueNumber"*, body *"live-test #120c bug 1"*.

**Contradiction with ground truth**: none of the reported symptom, endpoint, or root
cause can be located in the codebase (§3). The bug report cannot be reconciled with the
product as it exists.

---

## 3. Current State (verified against code)

How `widget-service` actually behaves today in the area the bug report references:

- **There is no `GET /widgets/:id` route.** `src/app.js` registers only:
  - `GET /health` → `200 { "ok": true }` (`src/app.js:21`)
  - `GET /price?qty=&unit=` → `200 { "total": <number> }` / `400 { "error": ... }` (`src/app.js:22`)
  - `GET /price/bulk?items=qty:unit,...` → `200 { "total": <number> }` / `400` (`src/app.js:32`)
- **There is no widget data store or lookup.** No persistence, no models, no
  `findById`/`lookup` code anywhere in `src/` (repo-wide grep: 0 matches). Consistent
  with `PRD.md` §6 (persistence Out of Scope) and §10 (no persistence constraint).
- **Unknown routes already return 404.** A request to any unregistered path (which
  includes `/widgets/123`) falls through to Express's **default 404** — an empty-body
  `404`, not a `200`. This is locked by a regression test (`src/app.test.js:187`).

So the specific reported behavior ("`/widgets/:id` returns **200** empty for a numeric
miss") does **not** occur here: there is no such route, and the closest real behavior
(unknown route) is already a `404`.

---

## 4. Proposed Changes

**None can be specified in this iteration.** Authoring before/after behavior for
`GET /widgets/:id` would require inventing the endpoint, its data source, and its
success/error contract — i.e. designing a new feature from assumptions, which is
explicitly disallowed ("NEVER make undocumented assumptions") and contradicts the
reported scope ("no new endpoints").

**What is explicitly NOT changing** (scope boundary): `/health`, `/price`, and
`/price/bulk` and all their documented behaviors remain untouched. No code change is
proposed until the blocker in §9 is resolved.

The three plausible reconciliations, each of which yields a *different* real delta, are
enumerated as decisions in §9 (Q11):
- **(a)** Wrong repo/branch → this issue belongs to a different codebase; no delta here.
- **(b)** Mislabeled defect on a real route (`/price` / `/price/bulk`) → restate, then
  a genuine bug-fix delta can be written.
- **(c)** A genuinely new widget-lookup endpoint is wanted → reclassify as a **feature**
  (not a bug fix) and remove the "no new endpoints" scope line.
- **(d)** Pure live-test artifact → close with no code change.

---

## 5. Impact Analysis

Because no change is specified, there is no product impact from this delta. Analysis of
each area (explicitly stated, not assumed):

- **User / consumer impact**: **None.** No endpoint behavior changes.
- **Data impact**: **None.** No schema, no migration (service is stateless).
- **API impact**: **None.** No contract added, changed, or removed. Existing
  `/health`, `/price`, `/price/bulk` contracts are unaffected.
- **Integration impact**: **None.** No consumers are affected.
- **Performance impact**: **None.** No code path changes.

The only "impact" is process: the issue is **blocked** and cannot proceed to
architecture/dev until Q11 is answered.

---

## 6. Requirements

- **New functional requirements**: **None specifiable** until the target endpoint is
  confirmed to exist (or the scope is corrected). Grounding a requirement on
  `GET /widgets/:id` would be fabricated.
- **Modified non-functional requirements**: None.
- **Backward compatibility**: The reported change was said to be "fully backward
  compatible." That claim cannot be validated against absent code; carried as a
  requirement for the future, reconciled delta.
- **Accessibility**: N/A (API-only service, no UX surface — `PRD.md` §9).

---

## 7. Migration & Rollback

- **Migration**: None — no change is made.
- **Rollback**: N/A — nothing to roll back. (The prior reconciliation questionnaire is
  additive documentation and carries no product risk.)
- **Communication**: The blocker and the four reconciliation options are surfaced to
  the operator via `GITHUB_COMMENT.md` and §9 below.

---

## 8. Testing Strategy

- **This iteration**: No tests to add or change (no code change).
- **When reconciled (b)** — mislabeled defect on a real route: add a `node:test` case
  asserting the corrected response for that route, using the existing `withServer`
  HTTP harness (`src/app.test.js:19`), and keep all current tests green.
- **When reconciled (c)** — new endpoint: full feature test coverage (success, numeric
  miss → 404, malformed id) plus regression over the three existing routes.
- **Regression baseline (must always stay green)**: the full suite in
  `src/app.test.js`, including the "unknown route returns 404" lock (`:187`) and the
  documented `/price` NaN → `{ total: null }` passthrough (`:180`).

---

## 9. Open Questions & Decisions

| ID | Question | Priority | Status | Answer |
|----|----------|----------|--------|--------|
| Q11 | The answered defect targets `GET /widgets/:id`, which does not exist in `src/app.js` (only `/health`, `/price`, `/price/bulk`). Which is correct: (a) wrong repo/branch, (b) mislabeled defect on a real route, (c) a genuinely new endpoint (= feature, not bug fix), or (d) live-test artifact / no change? | HIGH (BLOCKER) | OPEN | |
| Q12 | If (b): restate the expected vs. actual defect against a real route (`/price` or `/price/bulk`). Candidate real behaviors: `/price` returns `200 { "total": null }` for non-numeric input (`src/app.js:8`); unknown routes already `404` (`app.test.js:187`). Which is the intended "bug"? | HIGH | OPEN | |
| Q13 | If (c): define the new endpoint's data source (service is currently stateless — `PRD.md` §6/§10), success response shape, and not-found response. Confirm this reclassifies the work from bug fix to new feature and removes the "no new endpoints" scope line. | HIGH | OPEN | |

**To iterate**: answer **Q11** (and Q12 or Q13 as applicable) in this table or in
`PRD_DELTA_issue-2-QandA.md`, set Status → ANSWERED, and re-run. The next iteration will
then author a real, code-grounded delta.

---

## 10. Appendix

- **Related**: issue #2; iteration-1 questionnaire and iteration-2 reconciliation in
  `docs/requirements/PRD_DELTA_issue-2-QandA.md` (Q11–Q13); base `docs/requirements/PRD.md`.
- **Affected existing PRD sections (for the reconciled delta, not now)**: PRD §5–§7
  (capabilities/stories/functional requirements) if a route is added or changed; §6
  Out of Scope and §10 Constraints if persistence is introduced (option c).
- **Verification evidence**: `src/app.js:21,22,32` (only routes); `src/app.test.js:187`
  (unknown-route 404 lock), `:180` (NaN passthrough); repo-wide search for
  `widgets`/`findById`/`lookup` → 0 matches.
- **Note**: This appears to be a live-test scenario in which the injected answers
  intentionally reference a non-existent endpoint. The correct product-management
  action is to flag the contradiction, not to fabricate a specification.
