# PRD DIFF — Add Bulk Pricing Endpoint (issue #1)

> **Mode**: New Feature on an existing application (`NEW_FEATURE_OR_BUG_FIX`).
> **Scope**: This is a **delta** against the existing product PRD
> (`docs/requirements/PRD.md`). It documents ONLY the new bulk-pricing capability and
> its ripple effects — it does not restate the whole product.
>
> **Iteration**: 2 · **Issue**: #1 "Add bulk pricing endpoint" · **Branch**:
> `feature/issue-1`
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
introducing a new rule, and adds automated tests.

- **New features**: 1 (the `/price/bulk` endpoint).
- **Modified features**: 0 (existing `/price` and `/health` are untouched).
- **Affected areas**: API surface (one added route), test suite (new cases), product
  documentation (this delta + eventual PRD.md update).
- **Priority**: Standard feature request from the repository owner (issue #1).
- **Urgency**: Normal; no defect or outage driving it.

This is a **purely additive, backward-compatible** change: no existing endpoint,
contract, or behavior is altered.

---

## 2. Motivation & Background

**Why now**: Consumers that need to price a whole basket of widgets today must call
`GET /price` once **per line item** and sum the results client-side. This is
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

**How multi-line pricing works today**: it doesn't — there is no bulk endpoint. The
current API surface (`docs/requirements/PRD.md` §14.2, `src/app.js`) is:

| Method | Path | Behavior |
|--------|------|----------|
| GET | `/health` | Returns `{ "ok": true }` |
| GET | `/price?qty=&unit=` | Returns `{ "total": <number> }` for **one** line; `400` if `qty <= 0` |

**Existing limitation this change addresses**: a caller pricing a basket of, say,
three widget lines must issue three separate `GET /price` calls and add the three
`total` values itself. There is no server-side aggregation.

**Reused building block**: `priceWidget(qty, unitPrice)` in `src/app.js` —
- rejects `qty <= 0`,
- applies 10% discount when `qty >= 100`,
- returns `qty × unit × (1 − discount)` rounded to 2 decimals.

The new endpoint will call this same function once per line item.

---

## 4. Proposed Changes

### 4.1 NEW — `GET /price/bulk` endpoint

**What it is**: a read-only endpoint that accepts multiple line items in the query
string, prices each with the existing `priceWidget`, and returns the summed total.

**Request shape** (from issue #1):
- Query parameter `items`, a comma-separated list of line items.
- Each line item is `qty:unit` (quantity, colon, unit price). Example:
  `GET /price/bulk?items=10:2,100:2`.

**Before vs After**:

| | Before (today) | After (this change) |
|--|----------------|---------------------|
| Price a 3-line basket | 3× `GET /price` + client-side sum | 1× `GET /price/bulk?items=…` |
| Who sums the totals | The caller | The service |
| Discount rule source | `priceWidget` (per single call) | `priceWidget` (per line, unchanged) |

**Behavior**:
- Parse `items` into `(qty, unit)` pairs.
- For each pair, compute the line total via the **existing** `priceWidget` (so the
  10% `qty ≥ 100` discount and the `qty <= 0` rejection apply per line).
- Return the **sum** of all line totals as a JSON number.

**Proposed success response** (see Q1 for the exact envelope decision):
`200 { "total": <summed number> }` — consistent with the existing `/price` envelope
which also returns `{ "total": … }`.

**Error handling** (see Q2): if any line item is invalid (e.g. `qty <= 0`, or a
malformed `qty:unit` token), the request should fail with `400` and an `error`
message, mirroring the existing `/price` error style
(`400 { "error": "qty must be positive" }`).

**User story**:
- **US-BULK-1 — Price a multi-line basket in one call.** *As a calling system, I want
  to submit several `qty:unit` line items in one request and receive the combined
  discounted total, so that I don't have to make N calls and sum them myself.*
  - **Acceptance criteria**:
    1. `GET /price/bulk?items=10:2,100:2` returns `total = 20 + 180 = 200`
       (line 1: 10×2, no discount = 20; line 2: 100×2 with 10% off = 180).
    2. A single well-formed line item (`items=10:2`) returns that line's total (`20`).
    3. A line item with `qty <= 0` (e.g. `items=0:2`) yields `400` with an `error`
       message (reusing the `priceWidget` guard).
    4. The existing 10% discount at `qty ≥ 100` is applied per line, not to the sum.
    5. `GET /price` and `GET /health` behave exactly as before (regression).

### 4.2 NEW — Automated tests for bulk pricing

Issue #1 explicitly requires "Include tests." New test cases must cover: the
multi-line sum, per-line discount application, and the invalid-line rejection path,
in the existing `node:test` style (`src/app.test.js`).

### 4.3 Scope boundaries — what is explicitly NOT changing

- `GET /price` and `GET /health` — **unchanged**.
- The `priceWidget` discount rule (10% at `qty ≥ 100`) — **reused as-is, not
  modified**. No new discount tiers (consistent with Q&A Q6, which confirms the
  single-threshold rule is the whole rule).
- No persistence, auth, rate limiting, config, or observability is added — those
  remain Out of Scope per `PRD.md` §6. This feature does not require them.
- No change to the JSON-only, `GET`-only, stateless nature of the service.

---

## 5. Impact Analysis

### 5.1 User / consumer impact
- **Affected persona**: "Internal calling system / service" (`PRD.md` §4). Gains a
  new, optional endpoint. **No retraining or breaking change** — existing callers
  keep using `/price` unchanged.
- **Workflow change**: callers that price baskets *may* switch from N calls to 1;
  adoption is opt-in.

### 5.2 Data impact
- **None.** The service is stateless with no database (`PRD.md` §14.1). No schema,
  migration, or data transformation is involved.

### 5.3 API impact
- **Additive only.** One new route (`GET /price/bulk`) is introduced. No existing
  contract changes, so **no API versioning is required** and there are **no
  backward-compatibility concerns** for current consumers of `/price` or `/health`.
- The new endpoint reuses the existing response envelope (`{ "total": … }`) and error
  style (`{ "error": … }`) for consistency (subject to Q1/Q2).

### 5.4 Integration impact
- **None.** No webhooks, events, external systems, or third-party APIs are involved.

### 5.5 Performance impact
- **Negligible and bounded per request.** Pricing each line is O(1) in-memory
  arithmetic via `priceWidget`; a bulk call is O(N) in the number of line items with
  no I/O. The main consideration is an **unbounded `items` list** (see Q3 / §11) —
  a very large `items` string increases per-request work. Recommend documenting or
  enforcing a sane maximum (open question). Net effect on existing endpoints: **none**
  (they share no state).

---

## 6. Requirements

### New functional requirements
- **FR-BULK-1 — Bulk endpoint.** `GET /price/bulk?items=<qty:unit,…>` returns the
  summed discounted total across all provided line items.
- **FR-BULK-2 — Per-line pricing via existing rule.** Each line item is priced by the
  existing `priceWidget(qty, unit)` — 10% discount at `qty ≥ 100`, else none — and the
  results are summed. The discount is applied **per line**, never to the aggregate.
- **FR-BULK-3 — Input parsing.** `items` is a comma-separated list; each token is
  `qty:unit`, both coerced to numbers (consistent with `/price` using `Number(...)`).
- **FR-BULK-4 — Invalid-line handling.** A line with `qty <= 0` (or a malformed token)
  results in `400` with an `error` message, mirroring the existing `/price` error
  contract (exact behavior confirmed in Q2).
- **FR-BULK-5 — Response envelope.** On success, return `200 { "total": <number> }`,
  the sum rounded consistently with single-line pricing (confirmed in Q1).
- **FR-BULK-6 — Tests.** Provide automated tests (in the existing `node:test` style)
  covering the sum, per-line discount, and rejection paths (issue #1: "Include
  tests").

### Modified non-functional requirements
- **Performance**: remains constant-time per line; add a bounded-input consideration
  for `items` length (Q3). Otherwise NFRs in `PRD.md` §8 are unchanged.
- **Security**: unchanged posture (no auth/rate limiting added). This endpoint is, like
  the others, a public compute endpoint (`PRD.md` §8, `SECURITY_DESIGN.md`). The only
  new security-relevant note is the unbounded-`items` DoS surface (Q3 / §11).

### Backward compatibility requirements
- Existing `/price` and `/health` contracts MUST remain byte-for-byte compatible.
  The change is additive; no consumer of the current API should observe any
  difference.

### Accessibility requirements
- **N/A** — API-only service, no UI (`PRD.md` §9).

---

## 7. Migration & Rollback

- **Data migration**: none — stateless service, no schema (`PRD.md` §14.1).
- **Feature flag / gradual rollout**: not required. The new route is inert until
  called; existing traffic is unaffected. A flag may be added if the team prefers a
  dark launch, but it is not necessary for a purely additive read endpoint.
- **Rollback plan**: revert the commit that adds the `/price/bulk` route and its
  tests. Because the endpoint is stateless and additive, removing it has **no data or
  compatibility consequences** — callers simply fall back to N× `/price` calls.
- **Communication plan**: announce the new endpoint to internal consumers (README /
  API notes). No breaking-change notice needed.

---

## 8. Testing Strategy

**New-behavior tests (required by issue #1)**:
- **Sum correctness**: `items=10:2,100:2` → `total = 200` (20 + 180).
- **Single line**: `items=10:2` → `total = 20`.
- **Per-line discount**: a line with `qty ≥ 100` gets 10% off; a line below 100 does
  not — verified within the same bulk call.
- **Invalid line rejection**: `items=0:2` (or a malformed token) → `400` with an
  `error` message.

**Edge cases specific to this change** (final handling pinned by open questions):
- Empty `items` / missing `items` parameter (Q4).
- Malformed token (e.g. `items=10`, `items=10:2:3`, `items=abc:2`) (Q2).
- Very large `items` list (bounded-input, Q3).
- Non-numeric `qty`/`unit` producing `NaN` — decide whether to reject or mirror the
  existing `/price` `NaN` pass-through behavior (Q2; note `PRD.md` §7 documents that
  `/price` currently returns `{ "total": null }` for `NaN`).

**Regression areas (must not break)**:
- `GET /price?qty=&unit=` — unchanged totals, discount, and `400` on `qty <= 0`.
- `GET /health` — still `{ "ok": true }`.
- The three existing `priceWidget` unit tests in `src/app.test.js` must still pass.

**Performance check**: confirm a bulk call with a modest `items` list responds in the
same low-latency envelope as `/price` (pure arithmetic, no I/O).

---

## 9. Open Questions & Decisions

These are genuine decisions the issue text leaves unspecified. The reconstruction
Q&A (`PRD_issue-1-QandA.md`) answered *baseline-product* questions (e.g. Q6: no extra
discount tiers — incorporated into FR-BULK-2), but it did **not** specify the new
endpoint's contract details below.

| ID | Question | Priority | Status | Answer |
|----|----------|----------|--------|--------|
| Q1 | Response envelope: return `{ "total": <sum> }` (matches `/price`) or a richer body (e.g. per-line breakdown + `total`)? | HIGH | OPEN | |
| Q2 | Invalid/malformed line handling: reject the **whole** request with `400`, or skip/normalize bad lines? And should non-numeric `NaN` inputs be rejected (stricter than today's `/price` `NaN → null` pass-through)? | HIGH | OPEN | |
| Q3 | Should there be a maximum number of line items (bounded `items`) to cap per-request work and the DoS surface? If so, what limit? | MEDIUM | OPEN | |
| Q4 | Behavior for empty or missing `items` (e.g. `?items=` or no param): `400`, or `200 { "total": 0 }`? | MEDIUM | OPEN | |
| Q5 | Delimiter confirmation: line items separated by `,` and fields by `:` exactly as in the issue example — any need for URL-encoding guidance for callers? | LOW | OPEN | |
| Q6 | Should the summed `total` be rounded once at the end, or is summing already-rounded per-line totals (current `priceWidget` output) acceptable? | LOW | OPEN | |

**Decided (from inputs, not open)**:
- Reuse `priceWidget` as-is — required by issue #1; **no new discount tiers** (Q&A Q6
  confirms the single 10%/≥100 rule). → FR-BULK-2.
- Additive, backward-compatible; no versioning. → §5.3.
- Tests required. → FR-BULK-6.

---

## 10. Appendix

### 10.1 Related tickets / issues
- GitHub issue #1 — "Add bulk pricing endpoint" (primary and only source of this
  change).

### 10.2 Existing PRD sections affected
- `PRD.md` §5 (User Stories) — gains US-BULK-1 once implemented.
- `PRD.md` §6 (Scope & Features) — "Bulk / multi-line-item pricing" moves from **Out
  of Scope** to **In Scope** upon delivery.
- `PRD.md` §7 (Functional Requirements) — gains FR-BULK-1..6.
- `PRD.md` §14.2 (API Surface) — gains the `GET /price/bulk` row.

### 10.3 Proposed API surface after this change

| Method | Path | Success | Error |
|--------|------|---------|-------|
| GET | `/health` | `200 { "ok": true }` | — |
| GET | `/price?qty=&unit=` | `200 { "total": <number> }` | `400 { "error": "qty must be positive" }` |
| **GET** | **`/price/bulk?items=qty:unit,…`** | **`200 { "total": <summed number> }`** | **`400 { "error": <message> }`** (subject to Q1/Q2) |

### 10.4 Supporting references
- `src/app.js` → `priceWidget`, `/price`, `/health` handlers (reused / unchanged).
- `src/app.test.js` → existing `node:test` patterns to extend.
- `docs/requirements/PRD.md` → baseline product requirements.
- `docs/requirements/PRD_issue-1-QandA.md` → baseline reconstruction Q&A (Q6 informs
  FR-BULK-2).
- `docs/design/technical/API_CONTRACTS.md` → existing contract & `NaN` edge behavior
  (informs Q2).
