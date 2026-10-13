# PRD DIFF — Add Bulk Pricing Endpoint (issue #1)

> **Mode**: New Feature on an existing application (`NEW_FEATURE_OR_BUG_FIX`).
> **Scope**: This is a **delta** against the existing product PRD
> (`docs/requirements/PRD.md`). It documents ONLY the new bulk-pricing capability and
> its ripple effects — it does not restate the whole product.
>
> **Iteration**: 6 · **Issue**: #1 "Add bulk pricing endpoint" · **Branch**:
> `feature/issue-1`
>
> **Status**: `GET /price/bulk` is **implemented and shipped** in `src/app.js` and
> fully covered by `src/app.test.js` (39 runtime tests, 100% line coverage). The six
> open questions from iteration 2 (Q1–Q6) are **RESOLVED** by the delivered code and
> the baseline reconstruction Q&A (`docs/requirements/PRD_issue-1-QandA.md`). This
> delta describes what shipped and records the resolved decisions.
>
> **Iteration-6 changes (review follow-up)**: Resolves the four gaps raised in PRD
> review iteration 4 against the iteration-5 delta:
> - **GAP-DIFF-001 (HIGH)** — the delta's Functional-Requirement IDs now **reuse the
>   authoritative `PRD.md` §7 `FR-BULK-1..7` numbering verbatim** (see §6). The two
>   delta-only requirements (the umbrella endpoint statement and the dedicated tests
>   requirement) are marked as **proposed additions `FR-BULK-8`/`FR-BULK-9`** to be
>   folded into `PRD.md` on its next refresh, and §10.2 no longer claims `PRD.md`
>   already "gains" them.
> - **GAP-DIFF-002 (MEDIUM)** — the NFR subsection is retitled "New / extended
>   non-functional considerations" (nothing is *modified*).
> - **GAP-DIFF-003 (LOW)** — the rollback plan now names the actual four-commit range
>   and the shared-`priceWidget` caveat.
> - **GAP-DIFF-004 (LOW)** — error-message strings are now declared part of the
>   `/price/bulk` contract.
>
> **Baseline product** (unchanged, see `PRD.md`): a stateless Node.js/Express
> microservice exposing `GET /health` and `GET /price?qty=&unit=`, with the pricing
> rule in the pure function `priceWidget` (`src/app.js`).

---

## 1. Change Summary

Add a single new read-only HTTP capability, **`GET /price/bulk`**, that computes the
**summed discounted total across multiple line items** in one request. Each line item
carries its own quantity and unit price; the endpoint applies the **existing**
`priceWidget` discount rule (10% off at `qty ≥ 100`) to each line independently and
returns the sum. The change **reuses the existing pricing logic** rather than
introducing a new rule, and ships with automated tests.

- **New features**: 1 (the `/price/bulk` endpoint).
- **Modified features**: 0 (existing `/price` and `/health` behaviour is untouched).
- **Affected areas**: API surface (one added route), test suite (new cases), product
  documentation (this delta + `PRD.md` + `README.md`).
- **Priority**: Standard feature request from the repository owner (issue #1).
- **Urgency**: Normal; no defect or outage driving it.

This is a **purely additive, backward-compatible** change: no existing endpoint,
contract, or behaviour is altered. The endpoint is **all-or-nothing** — a single
invalid line rejects the entire request with `400`.

---

## 2. Motivation & Background

**Why now**: Consumers that need to price a whole basket of widgets previously had to
call `GET /price` once **per line item** and sum the results client-side. This is
repetitive, chatty (N calls for N lines), and forces each caller to re-implement the
summation. Issue #1 asks to centralize this into one call so the service remains the
single source of truth for pricing math.

**Business value**:
- **Fewer round trips** — one request instead of N for a multi-line order.
- **Consistency** — the discount rule stays owned by the service (via `priceWidget`),
  so callers cannot drift or mis-sum.
- **Reuse** — the issue explicitly requires "reusing the existing priceWidget logic,"
  so no new pricing semantics are introduced.

**Source**: GitHub issue #1 —
> "Add `GET /price/bulk?items=qty:unit,qty:unit` that returns the summed discounted
> total across line items, reusing the existing priceWidget logic. Include tests."

---

## 3. Current State

**How multi-line pricing worked before this change**: it didn't — there was no bulk
endpoint. The pre-change API surface (`docs/requirements/PRD.md` §14.2, `src/app.js`)
was:

| Method | Path | Behavior |
|--------|------|----------|
| GET | `/health` | Returns `{ "ok": true }` |
| GET | `/price?qty=&unit=` | Returns `{ "total": <number> }` for **one** line; `400` if `qty <= 0`; `400` on `±Infinity`; `200 { "total": null }` legacy pass-through on `NaN` |

**Limitation this change addressed**: a caller pricing a basket of, say, three widget
lines had to issue three separate `GET /price` calls and add the three `total` values
itself. There was no server-side aggregation.

**Reused building block**: `priceWidget(qty, unitPrice)` in `src/app.js` —
- rejects non-finite (`±Infinity`) `qty`/`unit`,
- rejects `qty <= 0`,
- applies 10% discount when `qty >= 100`,
- returns `qty × unit × (1 − discount)` rounded to 2 decimals.

The new endpoint calls this same function once per line item.

---

## 4. Proposed Changes

### 4.1 NEW — `GET /price/bulk` endpoint *(SHIPPED)*

**What it is**: a read-only endpoint that accepts multiple line items in the query
string, prices each with the existing `priceWidget`, and returns the summed total as
the existing `{ "total": <number> }` envelope.

**Request shape** (from issue #1):
- Query parameter `items`, a comma-separated list of line items. Callers should
  URL-encode the value (per `README.md`).
- Each line item is `qty:unit` (quantity, colon, unit price). Example:
  `GET /price/bulk?items=10:2,100:2`.

**Before vs After**:

| | Before (iteration 2 spec) | After (shipped) |
|--|---------------------------|-----------------|
| Price a 3-line basket | 3× `GET /price` + client-side sum | 1× `GET /price/bulk?items=…` |
| Who sums the totals | The caller | The service |
| Discount rule source | `priceWidget` (per single call) | `priceWidget` (per line, unchanged) |
| Invalid-line handling | OPEN (Q2) | **Resolved**: all-or-nothing `400` |
| Item cap | OPEN (Q3) | **Resolved**: max 50 items |
| Empty/missing `items` | OPEN (Q4) | **Resolved**: `400 { "error": "items is required" }` |
| Response envelope | OPEN (Q1) | **Resolved**: `{ "total": <sum> }` |

**Behavior (as delivered)**:
- If `items` is missing, empty, or non-string (e.g. a repeated `items` param coerced
  by Express to an array), return `400 { "error": "items is required" }`.
- Split `items` on `,`. If the token count exceeds **50**, return
  `400 { "error": "too many items (max 50)" }`.
- For each token, split on `:`; a token that is not exactly two parts yields
  `400 { "error": "invalid item '<token>'" }` (this also rejects empty tokens from
  adjacent/trailing delimiters).
- Coerce each `qty`/`unit` with `Number(...)`; a non-finite result (`NaN` **or**
  `±Infinity`, including overflow of absurdly long digit strings) yields
  `400 { "error": "invalid item '<token>'" }`. This is **stricter than `/price`** by
  design (see §9 Q2).
- Price each line via the existing `priceWidget` (so `qty <= 0` throws
  `"qty must be positive"` → `400`, and the 10%/≥100 discount applies per line).
- Maintain a running sum; if it overflows to `Infinity` (possible even when every line
  is individually finite), return `400 { "error": "total is too large" }` (see §9 Q2a).
- On success, return `200 { "total": +total.toFixed(2) }` — rounded once at the end.

**User stories (shipped)**:
- **US-BULK-1 — Price a multi-line basket in one call.** *As a calling system, I want
  to submit several `qty:unit` line items in one request and receive the combined
  discounted total, so that I don't have to make N calls and sum them myself.*
  - **Acceptance criteria (all verified by tests in `src/app.test.js`)**:
    1. `GET /price/bulk?items=10:2,100:2` returns `{ "total": 200 }`
       (line 1: 10×2, no discount = 20; line 2: 100×2 with 10% off = 180).
    2. A single well-formed line item (`items=10:2`) returns `{ "total": 20 }`.
    3. The summed total is rounded once at the end:
       `items=1:0.1,1:0.2` → `{ "total": 0.3 }` (not `0.30000000000000004`).
    4. The 10% discount at `qty ≥ 100` is applied per line, not to the sum
       (`items=99:2` → `198`, no discount; `items=100:2` → `180`).
- **US-BULK-2 — Fail fast and clearly on bad input.** *As a calling system, I want a
  single clear `400` whenever any line is malformed or out of range, so I never get a
  silently wrong aggregate.*
  - **Acceptance criteria (all verified by tests)**:
    1. `qty <= 0` on any line (`items=0:2`, `items=-5:10`) → `400 { "error": "qty must be positive" }`.
    2. Malformed token (`items=abc:2`, `items=10`, `items=10:2:3`, adjacent/trailing
       delimiters, repeated `items` param) → `400 { "error": "invalid item '<token>'" }`
       or `items is required`.
    3. Non-finite token (`items=1e400:2`, or a 400-digit string) → `400 invalid item`.
    4. More than 50 items → `400 { "error": "too many items (max 50)" }`; exactly 50 is
       accepted.
    5. A sum that overflows to `Infinity` (50× `1e307:1`) → `400 { "error": "total is too large" }`.
    6. `GET /price` and `GET /health` behave exactly as before (regression).

### 4.2 NEW — Automated tests for bulk pricing *(SHIPPED)*

Issue #1 explicitly requires "Include tests." `src/app.test.js` now covers: the
multi-line sum, single line, per-line discount, final rounding, the 50-item cap and its
boundary, missing/empty/non-string `items`, malformed and empty tokens, non-finite and
overflow tokens, negative qty, the aggregate-overflow guard, and regression of
`/price`, `/health`, 404 fall-through, and GET-only verb handling. All run via Node's
built-in `node:test` and `fetch` against an ephemeral port (no new dependency).

### 4.3 Scope boundaries — what is explicitly NOT changing

- `GET /price` and `GET /health` — **unchanged** (verified by regression tests).
- The `priceWidget` discount rule (10% at `qty ≥ 100`) — **reused as-is, not modified**.
  No new discount tiers (Q&A Q8 confirms the single-threshold rule is the whole rule).
- No **per-line breakdown** in the response — aggregate `{ "total" }` only (Q&A Q6).
- No persistence, auth, rate limiting, env-based config, or observability is added —
  those remain Out of Scope per `PRD.md` §6.
- No change to the JSON-only, `GET`-only, stateless nature of the service.
- The legacy `/price` `NaN → { "total": null }, 200` pass-through is **deliberately
  preserved on `/price`** and is **not** inherited by `/price/bulk` (Q&A Q2/Q3).

---

## 5. Impact Analysis

### 5.1 User / consumer impact
- **Affected persona**: "Internal calling system / service" and the newly-inferred
  **cart/basket caller** (`PRD.md` §4, Q&A Q5). Gains a new, optional endpoint.
  **No retraining or breaking change** — existing callers keep using `/price` unchanged.
- **Workflow change**: callers that price baskets *may* switch from N calls to 1;
  adoption is opt-in.

### 5.2 Data impact
- **None.** The service is stateless with no database (`PRD.md` §14.1). No schema,
  migration, or data transformation is involved.

### 5.3 API impact
- **Additive only.** One new route (`GET /price/bulk`) is introduced. No existing
  contract changes, so **no API versioning is required** and there are **no
  backward-compatibility concerns** for current consumers of `/price` or `/health`.
- The new endpoint reuses the existing success envelope (`{ "total": … }`) and error
  style (`{ "error": … }`) for consistency.
- **Error-contract divergence (intentional)**: unlike `/price`, the bulk endpoint
  rejects `NaN`/non-finite fields with `400` rather than passing through to a `null`
  total. This is a new, stricter contract for a *new* endpoint — it does not change
  `/price`.

### 5.4 Integration impact
- **None.** No webhooks, events, external systems, or third-party APIs are involved.

### 5.5 Performance impact
- **Negligible and bounded per request.** Pricing each line is O(1) in-memory
  arithmetic via `priceWidget`; a bulk call is O(N) in the number of line items with no
  I/O. The **50-item cap** (`MAX_BULK_ITEMS`) bounds per-request work and the DoS
  surface; the per-field finiteness guard additionally rejects absurdly long
  overflow-to-`Infinity` digit strings. Net effect on existing endpoints: **none**
  (they share no state).

---

## 6. Requirements

> **Numbering note (GAP-DIFF-001 fix)**: The functional-requirement IDs below are the
> **same IDs already published in `PRD.md` §7** (`FR-BULK-1 … FR-BULK-7`), reused
> verbatim so that an "FR-BULK-n" reference means the identical requirement in both the
> authoritative product PRD and this delta. `FR-BULK-8` and `FR-BULK-9` are **proposed
> additions introduced by this delta** — they do not yet exist in `PRD.md` and should be
> folded into `PRD.md` §7 on its next refresh (see §10.2). They are flagged
> *(delta-proposed)* below.

### New functional requirements (all DELIVERED) — IDs aligned to `PRD.md` §7

- **FR-BULK-1 — Presence.** `items` must be a non-empty string; a missing, empty, or
  non-string `items` (e.g. a repeated param coerced to an array) yields
  `400 { "error": "items is required" }`. (`src/app.js:37`)
- **FR-BULK-2 — Item cap.** At most `MAX_BULK_ITEMS` (50) comma-separated tokens; more
  yields `400 { "error": "too many items (max 50)" }`; exactly 50 is accepted.
  (`src/app.js:31,41`)
- **FR-BULK-3 — Token shape.** Each token must split on `:` into exactly two parts
  (`qty:unit`); otherwise `400 { "error": "invalid item '<token>'" }` (this also
  rejects empty tokens from adjacent/trailing delimiters). (`src/app.js:47`)
- **FR-BULK-4 — Per-field finiteness (stricter than `/price`).** Each parsed
  `qty`/`unit` must satisfy `Number.isFinite`; a `NaN` or `±Infinity` field (including
  overflow of long digit strings) yields `400 { "error": "invalid item '<token>'" }`.
  Deliberate divergence from `/price`'s `NaN` pass-through so a bulk aggregate is never
  a nonsensical `null` (Q&A Q2). (`src/app.js:54`)
- **FR-BULK-5 — Per-line pricing via the existing rule.** Each valid line is priced by
  the existing `priceWidget(qty, unit)`, inheriting `PRD.md` FR-1..FR-4 — the 10%
  discount at `qty ≥ 100` (else none) and the `qty <= 0` → `400 { "error": "qty must be
  positive" }` path. The discount is applied **per line**, never to the aggregate.
  (`src/app.js:57`)
- **FR-BULK-6 — Running-sum overflow guard (Q2a).** After adding each line, the running
  `total` is re-validated with `Number.isFinite`; overflow to `Infinity` →
  `400 { "error": "total is too large" }` (fail-fast, all-or-nothing). (`src/app.js:63`)
- **FR-BULK-7 — All-or-nothing aggregate.** On success, respond
  `200 { "total": +total.toFixed(2) }` (summed once, rounded once at the end); any
  single failing line rejects the entire request with no partial total. (`src/app.js:67`)

### New functional requirements proposed by this delta (not yet in `PRD.md`)

- **FR-BULK-8 — Bulk endpoint (umbrella) *(delta-proposed)*.** `GET /price/bulk?items=<qty:unit,…>`
  exists as a single read-only route that returns the summed discounted total across
  all provided line items as `200 { "total": <number> }`. This is an umbrella statement
  over FR-BULK-1..7; fold into `PRD.md` §7 on next refresh.
- **FR-BULK-9 — Tests *(delta-proposed)*.** Automated `node:test` coverage exists for
  every requirement above, plus regression of `/price`, `/health`, 404, and GET-only
  verbs (issue #1: "Include tests"). Fold into `PRD.md` §7 on next refresh.

### New / extended non-functional considerations

*(No existing NFR in `PRD.md` §8 is modified; the items below are new considerations
that apply only to the new `/price/bulk` route — consistent with §1's "Modified
features: 0".)*

- **Performance**: constant-time per line; per-request work bounded by the 50-item cap.
  Other NFRs in `PRD.md` §8 are unchanged.
- **Security**: unchanged posture (no auth/rate limiting added). The 50-item cap and
  finiteness guards bound the bulk DoS surface noted in `PRD.md` §11.

### Backward compatibility requirements
- Existing `/price` and `/health` contracts remain byte-for-byte compatible — same
  status codes, same response envelopes, same legacy `/price` `NaN → { "total": null }`
  pass-through (verified by regression tests). The change is additive; no current
  consumer observes any difference.
- **Error-string stability (GAP-DIFF-004 fix)**: the specific `error` message text
  enumerated in §10.3 for `/price/bulk` (`"items is required"`, `"too many items (max
  50)"`, `"invalid item '<token>'"`, `"qty must be positive"`, `"total is too large"`)
  is treated as **part of the `/price/bulk` contract** — it is asserted verbatim by
  `src/app.test.js`. Changing this wording requires a deliberate, tested decision, not
  an incidental edit, because external callers may string-match on it.

### Accessibility requirements
- **N/A** — API-only service, no UI (`PRD.md` §9).

---

## 7. Migration & Rollback

- **Data migration**: none — stateless service, no schema (`PRD.md` §14.1).
- **Feature flag / gradual rollout**: not required. The route is inert until called;
  existing traffic is unaffected.
- **Rollback plan (GAP-DIFF-003 fix)**: the feature was introduced and hardened across
  **four commits**, not one — revert the commit range
  `fcd74b2`..`e6e6a8d`:
  - `fcd74b2` feat(price): add GET /price/bulk endpoint (issue #1)
  - `2257de0` fix(price): reject non-finite input on /price and /price/bulk (iter 4)
  - `34836a7` feat(issue-1): add Q2a aggregate-overflow guard to /price/bulk
  - `e6e6a8d` Add GET /price/bulk endpoint (issue #1) (#4)

  **Caveat**: `2257de0` also touches the shared `priceWidget` function used by
  `/price` (the `±Infinity` finiteness guard, `PRD.md` FR-4). Before rolling back,
  confirm whether reverting that commit is intended to also drop the intentionally-added
  `/price` `Infinity` rejection; if `/price`'s guard must stay, revert only the
  bulk-specific commits (`fcd74b2`, `34836a7`, `e6e6a8d`) and the bulk portion of
  `2257de0`. Because the endpoint is stateless and additive, removing it has **no data
  or compatibility consequences** — callers fall back to N× `/price` calls.
- **Communication plan**: the new endpoint is documented in `README.md` (max 50 items,
  URL-encode `items`, all-or-nothing `400`). No breaking-change notice needed.

---

## 8. Testing Strategy

**New-behavior tests (delivered, required by issue #1)**:
- **Sum correctness**: `items=10:2,100:2` → `{ "total": 200 }` (20 + 180).
- **Single line**: `items=10:2` → `{ "total": 20 }`.
- **Per-line discount**: within one call, `qty ≥ 100` gets 10% off, below does not
  (`99:2` → `198`).
- **Final rounding**: `1:0.1,1:0.2` → `{ "total": 0.3 }`.
- **Invalid-line rejection**: `qty <= 0` (`0:2`, `-5:10`), malformed tokens (`abc:2`,
  `10`, `10:2:3`), empty tokens (adjacent/trailing delimiters), non-finite tokens
  (`1e400:2`, 400-digit strings), repeated/non-string `items`.
- **Item cap**: 51 items → `400 too many items`; exactly 50 → `200`.
- **Aggregate overflow**: 50× `1e307:1` → `400 total is too large`.

**Regression areas (must not break — all have tests)**:
- `GET /price?qty=&unit=` — unchanged totals, discount, `400` on `qty <= 0`, `400` on
  `±Infinity`, and the documented `NaN → { "total": null }, 200` pass-through.
- `GET /health` — still `{ "ok": true }`.
- Unknown route → `404`; non-GET verbs (`POST`/`PUT`/`DELETE`) on `/price` and
  `/price/bulk` → `404` (GET-only surface).
- The three existing `priceWidget` unit tests still pass.

**Observed signal** (authoritative QA run, carried from `PRD.md` §3): 39 runtime tests
pass; 100% line/statement/function coverage; 96.55% branch (the sole uncovered branch
is the `require.main === module` entrypoint guard, not exercised under test).

---

## 9. Open Questions & Decisions

All six iteration-2 open questions are now **RESOLVED** by the shipped code and the
baseline Q&A. They are kept below for traceability.

| ID | Question | Priority | Status | Answer |
|----|----------|----------|--------|--------|
| Q1 | Response envelope: `{ "total": <sum> }` or a richer body? | HIGH | RESOLVED | `{ "total": <sum> }`, rounded once at the end — matches `/price`. No per-line breakdown (Q&A Q6). (`src/app.js:67`) |
| Q2 | Invalid/malformed line handling; reject `NaN`/non-finite stricter than `/price`? | HIGH | RESOLVED | **All-or-nothing `400`**; any bad line rejects the whole request. `NaN`/`±Infinity` fields are rejected — stricter than `/price` by design (Q&A Q2). (`src/app.js:47,54`) |
| Q2a | Can the running sum overflow to `Infinity` despite per-line finiteness? | HIGH | RESOLVED | Yes; guarded — running sum re-validated each line, overflow → `400 total is too large` (Q&A Q2a). (`src/app.js:63`) |
| Q3 | Maximum number of line items? | MEDIUM | RESOLVED | **Yes, 50** (`MAX_BULK_ITEMS`); 51 → `400 too many items (max 50)`, exactly 50 accepted. (`src/app.js:31,41`) |
| Q4 | Behaviour for empty/missing `items`? | MEDIUM | RESOLVED | `400 { "error": "items is required" }` (also covers non-string/repeated param). (`src/app.js:37`) |
| Q5 | Delimiter / URL-encoding guidance? | LOW | RESOLVED | `,` between items, `:` between fields (per issue example); `README.md` instructs callers to URL-encode `items`. |
| Q6 | Round once at the end or sum already-rounded per-line totals? | LOW | RESOLVED | **Round once at the end** (`+total.toFixed(2)`); verified by the `1:0.1,1:0.2 → 0.3` test. (`src/app.js:67`) |

**Decided (from inputs)**:
- Reuse `priceWidget` as-is — required by issue #1; **no new discount tiers** (Q&A Q8).
  → FR-BULK-5.
- Additive, backward-compatible; no versioning. → §5.3.
- Tests required and delivered. → FR-BULK-9 *(delta-proposed)*.

**Review follow-up (iteration 6)** — all four PRD-review-iteration-4 gaps are addressed
in this delta: GAP-DIFF-001 (FR-BULK IDs re-aligned to `PRD.md`, §6 + §10.2),
GAP-DIFF-002 (NFR subsection retitled, §6), GAP-DIFF-003 (rollback commit range, §7),
GAP-DIFF-004 (error-string stability, §6). **No open questions remain for this change.**

---

## 10. Appendix

### 10.1 Related tickets / issues
- GitHub issue #1 — "Add bulk pricing endpoint" (primary and only source of this
  change). Architecture iteration 4 complete (comment on issue #1, commit `5e9da36d`).
- PRD review iteration 4 — gap analysis that drove the iteration-6 corrections
  (`work-in-progress/issue-1/external-memory/prd-review/iteration-4/PRD_GAP_ANALYSIS.md`).

### 10.2 Existing PRD sections affected
- `PRD.md` §5 (User Stories) — US-BULK-1/US-BULK-2 correspond to the already-published
  **US-4** (price a whole multi-line order) and **US-5** (all-or-nothing rejection).
- `PRD.md` §6 (Scope & Features) — "Bulk / multi-line-item pricing" is already **In
  Scope** (promoted in `PRD.md` iteration 3).
- `PRD.md` §7 (Functional Requirements) — **already documents `FR-BULK-1..7`** for this
  capability (published in `PRD.md` iterations 3–4). This delta reuses those seven IDs
  verbatim (§6) and **proposes two additions**, `FR-BULK-8` (umbrella endpoint) and
  `FR-BULK-9` (tests), which should be folded into `PRD.md` §7 on its next refresh —
  `PRD.md` does **not** yet contain them.
- `PRD.md` §14.2 (API Surface) — the `GET /price/bulk` row (already present).

### 10.3 API surface after this change

| Method | Path | Success | Error |
|--------|------|---------|-------|
| GET | `/health` | `200 { "ok": true }` | — |
| GET | `/price?qty=&unit=` | `200 { "total": <number> }` | `400 { "error": "qty must be positive" }` / `400 "qty and unit must be finite"`; `NaN → 200 { "total": null }` (legacy) |
| **GET** | **`/price/bulk?items=qty:unit,…`** | **`200 { "total": <summed number> }`** | **`400` one of: `items is required` · `too many items (max 50)` · `invalid item '<token>'` · `qty must be positive` · `total is too large`** |

*(The exact `error` strings above are contractual for `/price/bulk` — see §6
"Error-string stability".)*

### 10.4 Supporting references
- `src/app.js` → `priceWidget`, `/price`, `/health`, `/price/bulk` handlers
  (lines cited inline in §6 and §9).
- `src/app.test.js` → `node:test` suite (39 runtime tests).
- `docs/requirements/PRD.md` → baseline product requirements (authoritative FR-BULK-1..7).
- `docs/requirements/PRD_issue-1-QandA.md` → baseline reconstruction Q&A
  (Q2/Q2a/Q3/Q6/Q8 inform the resolutions above).
- `docs/design/technical/API_CONTRACTS.md` → existing contract & `NaN` edge behaviour.
- `README.md` → consumer-facing documentation of the new endpoint.
