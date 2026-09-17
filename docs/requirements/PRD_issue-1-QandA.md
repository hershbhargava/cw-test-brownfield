# PRD Reconstruction — Clarifying Questions & Assumptions (issue #1)

> This file records every ambiguity encountered while reverse-engineering the PRD
> for `widget-service`, and the assumption/decision used to proceed. Downstream
> workflows (architect, dev, QA) use this to distinguish PRD claims that rest on
> assumptions from those grounded directly in code.
>
> **Iteration**: 4 (CONTINUATION). Several iteration-1 assumptions were
> **superseded by the code**, which now implements `GET /price/bulk`; superseded
> entries below are marked and kept for traceability. Iteration 4 is a refinement
> pass — the code, tests, TDDs, and issue are unchanged since iteration 3, so every
> resolution below stands as re-verified against a fresh read of `src/app.js` and
> `src/app.test.js`. No new ambiguities surfaced.
>
> **Sources**: GitHub issue #1 (scope guidance only), `src/app.js`,
> `src/app.test.js`, `package.json`, `README.md`, and the reconstructed TDDs under
> `docs/design/**`.

---

## Q1 — Does the requested `GET /price/bulk` endpoint exist?  *(RESOLVED — status changed since iteration 1)*

- **Question**: Issue #1 asks to "Add `GET /price/bulk?items=qty:unit,qty:unit`…".
  Is this an existing capability to document, or a planned/aspirational feature?
- **Iteration-1 assumption (SUPERSEDED)**: It did not exist; recorded as Out of Scope.
- **Iteration-3 resolution**: It **now exists and is implemented**. `src/app.js`
  registers `app.get('/price/bulk', …)` with `MAX_BULK_ITEMS = 50`, parses
  `items=qty:unit,…`, prices each line with `priceWidget`, and returns the summed
  `{ total }`. It is covered by tests in `src/app.test.js` (parsing, summation,
  cap, malformed-token, `NaN`/`Infinity`, negative-qty, and running-sum overflow).
  The PRD documents it as a shipped In-Scope feature (§5 US-4/US-5, §6, §7
  FR-BULK-1..7).
- **Impact if wrong**: If the route were reverted, PRD §5–§7 would lose a capability
  and the PRD would need re-running.
- **Source**: `src/app.js` (`/price/bulk` handler); `src/app.test.js`;
  `docs/design/TDD.md` §D1–D11; `docs/design/technical/API_CONTRACTS.md` §3.

## Q2 — Should bulk reject `NaN` fields even though `/price` passes them through?  *(RESOLVED)*

- **Question**: `/price` coerces bad input to `NaN` and returns
  `200 { "total": null }`. Should `/price/bulk` do the same, or reject?
- **Decision**: **Reject.** The bulk handler applies `Number.isFinite` to each parsed
  `qty`/`unit` and returns `400 { "error": "invalid item '<token>'" }` for
  `NaN`/`±Infinity`. This is a deliberate divergence from `/price` so a bulk
  aggregate can never be a nonsensical `null` (`src/app.js` comment; `TDD.md`
  §D3/Q2).
- **Impact if wrong**: If bulk should mirror `/price`, FR-BULK-4 changes.
- **Source**: `src/app.js` (`/price/bulk` per-field finite check); `TDD.md` §D3.

## Q2a — Can the bulk running sum overflow to `Infinity` despite per-line finiteness?  *(RESOLVED)*

- **Question**: Up to 50 individually-finite line totals can still sum past
  `Number.MAX_VALUE` to `Infinity` (which `+(Infinity).toFixed(2)` serializes as
  JSON `null` with `200`). Is this guarded?
- **Decision**: **Guarded.** After adding each line, the running `total` is
  re-validated with `Number.isFinite`; on overflow the request fails fast with
  `400 { "error": "total is too large" }` (fail-fast, all-or-nothing). Verified by a
  dedicated test that submits 50 `1e307:1` lines.
- **Impact if wrong**: If removed, the overflow would resurface as `null`/`200`.
- **Source**: `src/app.js` (running-sum guard); `src/app.test.js` (overflow test);
  `TDD.md` §D3/Q2a.

## Q3 — Is the `/price` `NaN → { "total": null }` response intended behavior?

- **Question**: Malformed/missing `qty`/`unit` on `/price` produce
  `200 { "total": null }` instead of a `400`. By design or a bug?
- **Assumption**: **Legacy behavior, deliberately preserved.** The finiteness guard
  added in iteration ≥2 tightens only the `±Infinity` case; `NaN` is explicitly left
  passing through to keep the documented `/price` contract stable (`src/app.js`
  comment; `TDD.md` §D2a). `/price/bulk` does **not** inherit this passthrough
  (see Q2). Documented as a risk on `/price` only (§11).
- **Impact if wrong**: If `/price` should return `400`, its FR and §11 change.
- **Source**: `docs/design/technical/API_CONTRACTS.md` → Error semantics;
  `docs/design/TDD.md` §9/§D2a; `src/app.js` → `priceWidget`.

## Q4 — Should the `unit` (unit price) parameter be validated?

- **Question**: `priceWidget` validates only `qty` sign; `unit` can be zero or
  negative. Acceptable?
- **Assumption**: Acceptable for a trusted internal caller; no sign validation is
  added or required by the code (bulk still rejects non-finite `unit` via FR-BULK-4,
  but not negative `unit`).
- **Impact if wrong**: A new functional requirement and mitigation would be added to
  §7/§11.
- **Source**: `src/app.js` → `priceWidget`; `docs/design/technical/SECURITY_DESIGN.md`.

## Q5 — Who are the real users/consumers of the service?

- **Question**: There is no auth or identity model, so who calls the endpoints?
- **Assumption**: Internal systems/services (inferred from README "internal" framing
  and the machine-oriented JSON API). Iteration 3 adds a **cart/basket caller**
  persona inferred from the multi-line `/price/bulk` shape. Personas in §4 are
  inferred, not code-derived.
- **Impact if wrong**: The Target Users & Personas section (§4) would need revision.
- **Source**: `README.md`; `src/app.js` (`/price/bulk`);
  `docs/design/technical/SECURITY_DESIGN.md` (no auth).

## Q6 — Should the bulk response include a per-line breakdown?

- **Question**: Does `/price/bulk` return itemized per-line totals, or only the sum?
- **Decision**: **Aggregate only.** The handler returns `+total.toFixed(2)` as a
  single `{ total }` — no per-line array. Documented as Out of Scope (§6).
- **Impact if wrong**: If itemization is needed, the response contract expands.
- **Source**: `src/app.js` (`/price/bulk` response).

## Q7 — Is environment-based port configuration required?

- **Question**: Port `3000` is hardcoded with no `process.env` usage. Is
  configurability a requirement?
- **Assumption**: Not required by the current product; documented as a constraint and
  a deployment-flexibility risk.
- **Impact if wrong**: Adds a configurability non-functional requirement (§8/§10).
- **Source**: `src/app.js` → `app.listen(3000)`;
  `docs/design/technical/DEPLOYMENT_STRATEGY.md` → Environment/Config.

## Q8 — What discount tiers exist beyond the single 100-unit threshold?

- **Question**: Only one discount tier (10% at `qty >= 100`) is implemented. Are
  there other intended tiers?
- **Assumption**: No — the single threshold is the entire rule, as coded and tested,
  and it applies identically per-line in both `/price` and `/price/bulk`.
- **Impact if wrong**: The pricing formula (FR-1/FR-2) and stories would expand.
- **Source**: `src/app.js` → `priceWidget`; `src/app.test.js`.
