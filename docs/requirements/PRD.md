# Product Requirements Document — widget-service

> **Mode**: Reverse-engineered from the existing implementation. This PRD documents
> what the product **IS** today, inferred from real behavior in the codebase and the
> reconstructed Technical Design Documents under `docs/design/**`. It does **not**
> author new requirements from a wish list.
>
> **Sources of truth**: `src/app.js`, `src/app.test.js`, `package.json`,
> `README.md`, and the reconstructed TDDs (`docs/design/TDD.md`,
> `docs/design/technical/SYSTEM_ARCHITECTURE.md`, `.../API_CONTRACTS.md`,
> `.../SECURITY_DESIGN.md`, `.../DEPLOYMENT_STRATEGY.md`).
>
> **Iteration**: 4 · **Coverage**: complete for this repository (two source files —
> `src/app.js` 75 lines + `src/app.test.js` 278 lines / 39 runtime tests).
>
> **Iteration-4 note (refinement)**: No change to the ground truth since iteration 3
> — `src/app.js`, `src/app.test.js`, the five reconstructed TDDs under
> `docs/design/**`, and GitHub issue #1 are all unchanged. This pass re-verifies
> every citation against a fresh read of the code, confirms the test-suite size (33
> top-level `test(...)` registrations plus a 3-method `for`-loop over
> `['POST','PUT','DELETE']` generating 6 more = **39 runtime tests**), and carries
> the content forward unchanged. The substantive delta remains the one below.
>
> **Iteration-3 delta (vs. iteration 1)**: The bulk-pricing endpoint
> `GET /price/bulk` — previously listed as Out of Scope / a feature gap — is now
> **implemented** in `src/app.js` (`app.get('/price/bulk', …)`) and covered by
> `src/app.test.js`. This PRD promotes it from "gap" to a **shipped In-Scope
> feature** (§5, §6, §7). Two input-hardening behaviors were added alongside it: a
> **finiteness guard** in the shared `priceWidget` (rejects `±Infinity`), and a
> **running-sum overflow guard** unique to the bulk handler. Both are documented as
> functional requirements below.

---

## 1. Executive Summary

`widget-service` is an internal, stateless HTTP microservice (Node.js + Express 4)
that computes the discounted price of a widget order. It exposes **three** `GET`
endpoints: a liveness probe (`/health`), a single-line pricing calculation
(`/price`), and a **bulk multi-line pricing calculation** (`/price/bulk`). The core
pricing rule lives in a pure function, `priceWidget`, which predates the current
tooling (per the inline comment in `src/app.js`: "Existing business logic —
pre-dates CoWeave adoption.").

The product's job is to answer *"given one or more (quantity, unit price) line
items, what is the total after any volume discount?"* over HTTP, in JSON. It holds
no state, has no database, no authentication, and no frontend. It is packaged as
`widget-service` v1.2.0 (`package.json`).

**Tech stack in use** (from the manifests and code):

| Concern | Choice |
|---------|--------|
| Language / runtime | JavaScript (CommonJS) on Node.js |
| Web framework | Express `^4.19.2` (sole runtime dependency) |
| Tests | Built-in `node:test` + `node:assert` |
| Build tooling | None (runs as-is, no transpile/bundle) |
| Persistence | None |

---

## 2. Background & Strategic Context

Inferred from the code and README, `widget-service` exists to centralize one piece
of business logic — **volume-discounted widget pricing** — behind a small HTTP API
so that other internal systems can obtain a consistent price without re-implementing
the discount rule. The README describes it as an "Internal widget pricing service…
Existing codebase," and the pricing function carries a comment noting it predates
the current tooling. Together these indicate the service wraps a pre-existing,
trusted pricing calculation and exposes it as a reusable internal endpoint.

The problem it solves: a single, authoritative place to compute
`total = qty × unit_price`, with a **10% discount applied at quantities of 100 or
more**, avoiding duplicated or drifting pricing logic across consumers. The
`/price/bulk` endpoint extends that same authoritative rule to **carts / multi-line
orders**: rather than a caller issuing N separate `/price` calls and summing them
(and re-implementing rounding/summation itself), it submits all line items in one
request and receives the single summed total, each line priced by the identical
`priceWidget` logic (`src/app.js`, comment at the `/price/bulk` handler: "Additive:
reuses priceWidget per line item, sums the discounted line totals").

Because the service is stateless and dependency-free, it is trivially replicable and
cheap to run as internal infrastructure. No market analysis, competitive
positioning, or external-customer context is present in the code; none is fabricated
here.

---

## 3. Goals & Success Metrics

**Inferred product goals** (from observable behavior):

1. Provide a correct, consistent discounted-price calculation over HTTP for a single
   line item (`/price`) and for many line items in one call (`/price/bulk`).
2. Reuse one pricing rule (`priceWidget`) across both single and bulk paths so
   discounting never drifts between them.
3. Enforce input-integrity guards: reject non-positive quantities, reject non-finite
   (`±Infinity`) inputs, and reject a bulk request whose running sum overflows.
4. Offer a liveness signal so the process can be health-checked by orchestrators.
5. Remain simple to run and test (no build step, single dependency).

**Success metrics**: **Not instrumented at runtime.** The service contains no
logging, metrics, or tracing (`docs/design/technical/DEPLOYMENT_STRATEGY.md` →
Observability; `SYSTEM_ARCHITECTURE.md` §6). There is no in-code measurement of
latency, throughput, error rate, or usage. The only automated quality signal is the
test suite (`src/app.test.js`), which the authoritative test run reports as **39/39
tests passing** with **100% line / 96.55% branch / 100% function / 100% statement**
coverage (the sole uncovered branch is the `require.main === module` entrypoint
guard at `src/app.js` bottom, which is not exercised under test). Any operational
metrics would come from external infrastructure, which is not defined in this
repository.

---

## 4. Target Users & Personas

The service has **no authentication, authorization, or role model** (all routes are
fully public — `docs/design/technical/SECURITY_DESIGN.md`). Personas are therefore
inferred from the endpoints' purpose and the "internal service" framing, not from any
in-code identity system.

| Persona | Inferred from | Needs the service meets |
|---------|---------------|--------------------------|
| **Internal single-price caller / service** (primary) | `/price` is a machine-oriented JSON API; README calls it "internal" | Programmatic, consistent per-line widget-price calculation |
| **Internal cart / basket caller** (added in iteration 3) | `/price/bulk` accepts a comma-separated list of `qty:unit` line items (`src/app.js`) | One-request pricing of a whole multi-line order, summed with the same discount rule |
| **Platform / ops operator** | `/health` liveness endpoint (`src/app.js`) | A liveness signal for health checks and orchestration |
| **Developer / maintainer** | `src/app.test.js`, `package.json` scripts | Ability to run, test, and extend the pricing logic |

There is no notion of end-user accounts, tenants, or per-caller permissions in the
code.

---

## 5. User Scenarios & User Stories

Each story maps to a capability the code actually implements.

- **US-1 — Compute a single discounted total.** *As a calling system, I want the
  total for a quantity and unit price so that I get a consistent, discount-aware
  price.* → `GET /price?qty=&unit=` → `priceWidget(qty, unit)` in `src/app.js`
  returns `{ "total": <number> }`.
  - Below 100 units: no discount (e.g. `qty=10, unit=2` → `20`).
  - At 100+ units: 10% discount (e.g. `qty=100, unit=2` → `180`). Verified in
    `src/app.test.js`.

- **US-2 — Be rejected for an invalid quantity.** *As a calling system, I want a
  clear error when I send a non-positive quantity so that I don't act on a bad
  price.* → `qty <= 0` throws in `priceWidget`; the handler returns
  `400 { "error": "qty must be positive" }` (`src/app.js`,
  `docs/design/technical/API_CONTRACTS.md`).

- **US-3 — Be rejected for a non-finite input.** *As a calling system, I want
  `±Infinity` inputs rejected rather than silently producing a nonsensical total.* →
  `priceWidget` throws `Error('qty and unit must be finite')` for finite-`false`,
  non-`NaN` numeric inputs (e.g. `Number('1e400')`), surfaced as
  `400 { "error": "qty and unit must be finite" }` on `/price` (`src/app.js`
  finiteness guard; `TDD.md` §D2a).

- **US-4 — Price a whole multi-line order in one call.** *As a cart caller, I want to
  submit many `qty:unit` line items and get one summed, discount-aware total.* →
  `GET /price/bulk?items=10:2,100:2` prices each line with `priceWidget` and returns
  the sum, e.g. line 1 `10×2 = 20`, line 2 `100×2 −10% = 180`, sum
  `{ "total": 200 }` (`src/app.js` `/price/bulk`; `src/app.test.js`).

- **US-5 — Get an all-or-nothing rejection for a bad bulk request.** *As a cart
  caller, I want the entire bulk request rejected if any line is malformed or invalid
  so that I never act on a partial/incorrect total.* → missing/empty `items`,
  more than 50 tokens, a malformed `qty:unit` token, a `NaN`/`±Infinity` field, a
  `qty <= 0` line, or a running sum that overflows all return `400` with a specific
  `error` message and no partial result (`src/app.js`; `API_CONTRACTS.md` §3).

- **US-6 — Check that the service is alive.** *As an ops operator, I want a liveness
  endpoint so my orchestrator can tell the process is up.* → `GET /health` returns
  `200 { "ok": true }` unconditionally (`src/app.js`).

- **US-7 — Run and verify the pricing logic.** *As a maintainer, I want to run the
  unit tests so I can trust the discount rule and all guards.* → `npm run test` →
  `node --test src/` exercises `priceWidget` and both HTTP endpoints, 39 tests
  (`package.json`, `src/app.test.js`).

---

## 6. Scope & Features

### In Scope (built and observable)

| Feature | Where it lives | Behavior |
|---------|----------------|----------|
| Single discounted price calculation | `src/app.js → /price`, `priceWidget` | `qty × unit × (1 − discount)`, 10% off at `qty ≥ 100`, rounded to 2 decimals |
| **Bulk multi-line price calculation** | `src/app.js → /price/bulk`, `priceWidget` per line | Parses `items=qty:unit,…`, prices each line with `priceWidget`, returns the summed total rounded to 2 decimals |
| Quantity validation | `src/app.js → priceWidget` | Throws on `qty <= 0`, surfaced as HTTP `400` |
| **Finiteness validation** | `src/app.js → priceWidget` | Throws on non-`NaN` non-finite (`±Infinity`) `qty`/`unit`, surfaced as HTTP `400` |
| **Bulk request integrity guards** | `src/app.js → /price/bulk` | Missing `items`, >50-item cap, malformed token, `NaN`/`Infinity` field, and running-sum overflow each yield an all-or-nothing `400` |
| Liveness endpoint | `src/app.js → /health` | Always returns `{ ok: true }` |
| JSON HTTP interface | Express `res.json` | JSON responses over HTTP/1.1, `GET` only |
| Unit + endpoint tests | `src/app.test.js` | 39 tests: discount paths, guards, bulk parsing/summation, overflow, verb/404 |
| Importable module | `module.exports = { app, priceWidget }` | Server binds a port only when run directly, enabling test-without-listen |

### Out of Scope (verified absent in the code)

- **Per-line breakdown in the bulk response** — `/price/bulk` returns only the
  aggregate `{ "total": <number> }`; it does **not** return an itemized array of
  per-line totals (`src/app.js` returns `+total.toFixed(2)` only).
- **Bulk via request body / `POST`** — bulk is `GET`-only with a query-string
  `items` param; there is no JSON-body variant (`src/app.js`; unknown verbs 404 —
  `API_CONTRACTS.md`).
- **Currency / locale / tax handling** — totals are plain numbers; no currency,
  rounding-mode, or tax logic exists.
- **Persistence / database** — no DB driver, ORM, models, or migrations
  (`TDD.md` §7).
- **Authentication / authorization / RBAC** — none (`SECURITY_DESIGN.md`).
- **Rate limiting, CORS, security headers (helmet), TLS in-app** — none
  (`SECURITY_DESIGN.md`).
- **Configuration via environment** — port `3000` is hardcoded; no `process.env`
  reads (`SYSTEM_ARCHITECTURE.md` §6).
- **Logging / metrics / tracing** — none (`DEPLOYMENT_STRATEGY.md` → Observability).
- **Frontend / UI** — API-only service (`TDD.md` §7).
- **Non-GET methods, custom 404, central error middleware** — unknown routes fall to
  Express's default `404` (`API_CONTRACTS.md` → Undefined routes).
- **Containerization / CI/CD / IaC** — no Dockerfile, workflows, or IaC
  (`DEPLOYMENT_STRATEGY.md`).

---

## 7. Functional Requirements

The rules the code **actually enforces** (descriptive, from `src/app.js` and tests):

**Shared pricing logic (`priceWidget`):**

- **FR-1 — Pricing formula.** For a valid line, the total equals
  `qty × unit × (1 − discount)`, rounded to 2 decimal places.
- **FR-2 — Volume discount.** `discount = 0.10` when `qty >= 100`; otherwise
  `discount = 0`.
- **FR-3 — Quantity guard.** If `qty <= 0`, `priceWidget` throws
  `Error('qty must be positive')` → `400 { "error": "qty must be positive" }`.
- **FR-4 — Finiteness guard.** If `qty` or `unit` is a non-`NaN` non-finite number
  (`±Infinity`), `priceWidget` throws `Error('qty and unit must be finite')` →
  `400 { "error": "qty and unit must be finite" }`. `NaN` is intentionally **not**
  rejected here, preserving the legacy `/price` `NaN → { total: null }` passthrough
  (`src/app.js` comment; `TDD.md` §D2a).

**Single-line endpoint (`/price`):**

- **FR-5 — Parameter parsing.** `qty` and `unit` are read from the query string and
  coerced with `Number(...)`.
- **FR-6 — Response format.** Success is `200 { "total": <number> }`; the one
  validated failure is a `400` with an `error` string.

**Bulk endpoint (`/price/bulk`):**

- **FR-BULK-1 — Presence.** `items` must be a non-empty string; a missing, empty, or
  non-string `items` (e.g. repeated param → array) yields
  `400 { "error": "items is required" }`.
- **FR-BULK-2 — Item cap.** At most `MAX_BULK_ITEMS = 50` comma-separated tokens;
  more yields `400 { "error": "too many items (max 50)" }`.
- **FR-BULK-3 — Token shape.** Each token must split on `:` into exactly two parts;
  otherwise `400 { "error": "invalid item '<token>'" }`.
- **FR-BULK-4 — Per-field finiteness.** Each parsed `qty`/`unit` must satisfy
  `Number.isFinite`; a `NaN` or `±Infinity` field yields
  `400 { "error": "invalid item '<token>'" }`. This is **stricter than `/price`**,
  which passes `NaN` through — a deliberate divergence so a bulk aggregate is never a
  nonsensical `null` (`src/app.js` comment; `TDD.md` §D3/Q2).
- **FR-BULK-5 — Per-line pricing.** Each valid line is priced by `priceWidget`,
  inheriting FR-1..FR-4 (including the `qty <= 0` → `400 { "error": "qty must be
  positive" }` path).
- **FR-BULK-6 — Running-sum overflow guard (Q2a).** After adding each line, the
  running `total` is re-checked with `Number.isFinite`; if the sum overflows to
  `Infinity`, the request fails fast with `400 { "error": "total is too large" }`
  (`src/app.js` guard; `TDD.md` §D3/Q2a).
- **FR-BULK-7 — All-or-nothing aggregate.** On success, respond
  `200 { "total": +total.toFixed(2) }`; any single failing line rejects the entire
  request with no partial total.

**General:**

- **FR-8 — Liveness.** `GET /health` returns `200 { "ok": true }` with no dependency
  checks.
- **FR-9 — Unknown routes.** Any path/method not defined returns Express's default
  `404` (no custom handler).

**Documented current edge behavior (not an intended requirement):** on `/price`,
missing or non-numeric `qty`/`unit` coerce to `NaN`; because `NaN <= 0` is `false`
and `NaN` is not caught by the finiteness guard, the response is
`200 { "total": null }` rather than a `400` (`API_CONTRACTS.md` → Error semantics;
`TDD.md` §9). `unit` sign is not validated, so zero/negative unit prices are
accepted. `/price/bulk` deliberately does **not** share this `NaN` passthrough
(FR-BULK-4).

---

## 8. Non-Functional Requirements

Characteristics **as built** (from the TDDs and code):

- **Performance**: Pure in-memory arithmetic with no I/O. `/price` is effectively
  constant-time; `/price/bulk` is **O(N)** in the number of line items, bounded by
  the 50-item cap (`SYSTEM_ARCHITECTURE.md` §3; `src/app.js`). No downstream calls,
  DB, or cache.
- **Scalability**: Stateless single Node process; horizontally replicable behind an
  external load balancer, though no such infrastructure is defined in the repo
  (`DEPLOYMENT_STRATEGY.md` → Topology).
- **Resource safety**: The 50-item cap bounds per-request work and payload parsing,
  limiting the compute a single bulk call can trigger (`src/app.js` `MAX_BULK_ITEMS`).
- **Security**: No application-level controls — no auth, TLS-in-app, CORS, helmet,
  or rate limiting; all endpoints are public over plain HTTP (`SECURITY_DESIGN.md`).
- **Reliability / lifecycle**: No graceful shutdown (no `SIGTERM`/`SIGINT`
  handlers); in-flight requests are not drained on exit (`SYSTEM_ARCHITECTURE.md`
  §6).
- **Observability**: None — no logs, metrics, or traces (`DEPLOYMENT_STRATEGY.md`).
- **Configurability**: Port `3000` hardcoded; no environment-driven config.
- **Testability**: Server binds a port only when run directly, so `priceWidget` and
  both endpoints are testable without a hardcoded live server (`src/app.js`; the test
  harness spins up an ephemeral port — `src/app.test.js`).

---

## 9. User Experience & Design

**Not applicable — this is an API-only service with no frontend** (`TDD.md` §7,
`SYSTEM_ARCHITECTURE.md` §8). The "user experience" is the HTTP/JSON contract:

- Requests are plain `GET` calls with query parameters; responses are compact JSON
  objects (`{ "total": <number> }`, `{ "ok": true }`, or `{ "error": <message> }`).
- The bulk input is a single URL-encoded `items` string of `qty:unit` tokens, e.g.
  `?items=10:2,100:2` — a compact, copy-pasteable format requiring no request body.
- Error feedback is a `400` with a human-readable `error` string; bulk errors name
  the specific failure (`items is required`, `too many items (max 50)`,
  `invalid item '<token>'`, `qty must be positive`, `total is too large`).
- There is no UI, layout, responsiveness, or accessibility surface to document.

---

## 10. Assumptions, Dependencies & Constraints

**Reconstruction assumptions:**

- The README/comment framing ("internal", "pre-dates CoWeave adoption") is taken to
  mean the service is internal infrastructure wrapping pre-existing pricing logic.
- Personas are inferred from endpoint purpose because there is no in-code identity
  model.
- The stale iteration-1 PRD/Q&A and the `API_CONTRACTS.md` §3 label ("Designed — not
  yet implemented") are treated as **superseded by the code**, which now implements
  `/price/bulk`; the code is the source of truth.

**Real dependencies (from manifests):**

- Runtime: `express ^4.19.2` — the only production dependency (`package.json`).
- Tooling: Node.js built-in test runner (`node --test`); no third-party test deps.

**Constraints (as built):**

- Fixed listen port `3000` (not env-configurable).
- `GET`-only, JSON-only interface; bulk input capped at 50 line items.
- No persistence — the service cannot remember anything between requests.

---

## 11. Risks & Mitigations

| Risk | Basis | Mitigation status |
|------|-------|-------------------|
| `/price` malformed input returns `200 { "total": null }` instead of an error | `NaN` pass-through (`API_CONTRACTS.md`, `TDD.md` §9) | **Unmitigated on `/price`** (legacy behavior, deliberately preserved) — **mitigated on `/price/bulk`** via FR-BULK-4 |
| Non-finite (`±Infinity`) input yields a nonsensical total | pre-guard behavior | **Mitigated** — `priceWidget` finiteness guard (FR-4) rejects with `400` |
| Bulk aggregate overflows to `Infinity` → serialized as `null`, `200` | up to 50 finite lines can sum past `Number.MAX_VALUE` | **Mitigated** — running-sum guard (FR-BULK-6, Q2a) rejects with `400 "total is too large"` |
| Unbounded bulk request enabling excessive compute | large `items` list | **Mitigated** — 50-item cap (FR-BULK-2) |
| Unvalidated `unit` allows non-positive prices | `priceWidget` validates only `qty` sign | **Unmitigated** |
| No authentication — endpoints fully public | `SECURITY_DESIGN.md` | **Unmitigated** — relies on external network controls |
| No rate limiting — open compute endpoints | `SECURITY_DESIGN.md` | **Unmitigated** |
| Hardcoded port limits deployment flexibility | `SYSTEM_ARCHITECTURE.md` §6 | **Unmitigated** |
| No observability — hard to diagnose in production | `DEPLOYMENT_STRATEGY.md` | **Unmitigated** |
| No graceful shutdown — requests dropped on exit | `SYSTEM_ARCHITECTURE.md` §6 | **Unmitigated** |

---

## 12. Timeline & Milestones

**N/A — reconstructed from an existing implementation; no forward roadmap.** This
PRD documents the product as it exists at iteration 3 and does not fabricate a
delivery schedule.

---

## 13. Open Questions & Decisions

| # | Question | Current state / decision | Impact if wrong |
|---|----------|--------------------------|-----------------|
| Q1 | GitHub issue #1 requests `GET /price/bulk?items=qty:unit,…`. Is it implemented? | **Yes — now implemented** in `src/app.js` and tested in `src/app.test.js`. Documented as In Scope (§6) and FR-BULK-1..7 (§7). Supersedes the iteration-1 "gap" note. | If reverted, §5–§7 lose a capability; PRD must be re-run. |
| Q2 | Should bulk reject `NaN` fields even though `/price` passes them through? | **Decided: yes** — bulk rejects (`invalid item`), a deliberate divergence to avoid a `null` aggregate (`TDD.md` §D3/Q2). | If bulk must mirror `/price`, FR-BULK-4 changes. |
| Q2a | Can the bulk running sum overflow to `Infinity` despite per-line finiteness? | **Decided: guarded** — the running sum is re-validated per line; overflow → `400 "total is too large"` (`TDD.md` §D3/Q2a; `src/app.js`). | If guard removed, overflow re-appears as `null`/`200`. |
| Q3 | Is the `/price` `NaN → { "total": null }` behavior intended? | Assumed **legacy, deliberately preserved** — only the `Infinity` case was tightened (FR-4). | If it should be a `400`, `/price` FR changes. |
| Q4 | Should `unit` be validated (non-negative)? | No sign validation exists; assumed acceptable for trusted internal callers. | If required, a new FR and mitigation appear. |
| Q5 | Should the bulk response include per-line breakdown? | **Decided: no** — aggregate-only `{ total }` (§6 Out of Scope). | If itemization is needed, the response contract expands. |
| Q6 | Is port configurability required for deployment? | Assumed not (hardcoded `3000`). | Adds an NFR/config requirement if wrong. |

---

## 14. Appendix

### 14.1 Data Model (product view)

The service is **stateless with no persisted entities**. The only data are the
transient request/response values:

| Concept | Fields | Notes |
|---------|--------|-------|
| Pricing request | `qty` (number), `unit` (number) | Query-string inputs to `/price` |
| Bulk request | `items` (string) | Comma-separated `qty:unit` tokens, ≤ 50, to `/price/bulk` |
| Pricing result | `total` (number, 2 dp) | Computed by `priceWidget`; bulk sums per-line totals |
| Error | `error` (string) | Returned on any validation failure |
| Health | `ok` (boolean) | Always `true` from `/health` |

No database schema exists (`DATABASE_SCHEMA.md` intentionally not written per
`TDD.md` §7).

### 14.2 API Surface (as implemented)

| Method | Path | Success | Error(s) |
|--------|------|---------|----------|
| GET | `/health` | `200 { "ok": true }` | — |
| GET | `/price?qty=&unit=` | `200 { "total": <number> }` | `400 { "error": "qty must be positive" }`, `400 { "error": "qty and unit must be finite" }` |
| GET | `/price/bulk?items=qty:unit,…` | `200 { "total": <number> }` | `400` one of: `items is required` · `too many items (max 50)` · `invalid item '<token>'` · `qty must be positive` · `total is too large` |

### 14.3 References & Source Citations

- Code: `src/app.js` (`priceWidget`, `/health`, `/price`, `/price/bulk` handlers,
  `MAX_BULK_ITEMS`), `src/app.test.js` (39 tests: pricing, guards, bulk
  parsing/summation/overflow, verbs, 404), `package.json`, `README.md`,
  `.gitignore`.
- Reconstructed TDDs: `docs/design/TDD.md` (baseline §1–10 + Architecture Delta
  §D1–D11, incl. §D2a finiteness, §D3/Q2a overflow, §D4 handler, §D6 contract),
  `docs/design/technical/SYSTEM_ARCHITECTURE.md`,
  `docs/design/technical/API_CONTRACTS.md`,
  `docs/design/technical/SECURITY_DESIGN.md`,
  `docs/design/technical/DEPLOYMENT_STRATEGY.md`.
- Scope guidance (not a requirements source): GitHub issue #1 "Add bulk pricing
  endpoint".
