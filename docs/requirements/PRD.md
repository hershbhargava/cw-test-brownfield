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
> **Iteration**: 1 · **Coverage**: complete for this repository (two source files,
> ~33 lines).

---

## 1. Executive Summary

`widget-service` is an internal, stateless HTTP microservice (Node.js + Express 4)
that computes the discounted price of a widget order. It exposes two `GET`
endpoints: a liveness probe (`/health`) and a pricing calculation (`/price`). The
core pricing rule lives in a pure function, `priceWidget`, which predates the
current tooling (per the inline comment in `src/app.js`: "Existing business logic —
pre-dates CoWeave adoption.").

The product's single job is to answer the question *"given a quantity and a unit
price, what is the total, after any volume discount?"* over HTTP, in JSON. It holds
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
more**, avoiding duplicated or drifting pricing logic across consumers. Because the
service is stateless and dependency-free, it is trivially replicable and cheap to
run as internal infrastructure.

No market analysis, competitive positioning, or external-customer context is present
in the code; none is fabricated here.

---

## 3. Goals & Success Metrics

**Inferred product goals** (from observable behavior):

1. Provide a correct, consistent discounted-price calculation over HTTP.
2. Enforce the one business rule that exists: reject non-positive quantities.
3. Offer a liveness signal so the process can be health-checked by orchestrators.
4. Remain simple to run and test (no build step, single dependency).

**Success metrics**: **Not instrumented.** The service contains no logging,
metrics, or tracing (`docs/design/technical/DEPLOYMENT_STRATEGY.md` → Observability;
`SYSTEM_ARCHITECTURE.md` §6). There is therefore no in-code measurement of latency,
throughput, error rate, or usage. The only automated quality signal is the unit-test
suite over `priceWidget` (`src/app.test.js`), which asserts correct discounting and
the positivity guard. Any operational metrics would come from external
infrastructure, which is not defined in this repository.

---

## 4. Target Users & Personas

The service has **no authentication, authorization, or role model** (both routes are
fully public — `docs/design/technical/SECURITY_DESIGN.md`). Personas are therefore
inferred from the endpoints' purpose and the "internal service" framing, not from any
in-code identity system.

| Persona | Inferred from | Needs the service meets |
|---------|---------------|--------------------------|
| **Internal calling system / service** (primary) | `/price` is a machine-oriented JSON API; README calls it "internal" | Programmatic, consistent widget-price calculation |
| **Platform / ops operator** | `/health` liveness endpoint (`src/app.js`) | A liveness signal for health checks and orchestration |
| **Developer / maintainer** | `src/app.test.js`, `package.json` scripts | Ability to run, test, and extend the pricing logic |

There is no notion of end-user accounts, tenants, or per-caller permissions in the
code.

---

## 5. User Scenarios & User Stories

Each story maps to a capability the code actually implements.

- **US-1 — Compute a discounted total.** *As a calling system, I want to request the
  total for a quantity and unit price so that I get a consistent, discount-aware
  price.* → `GET /price?qty=&unit=` → `priceWidget(qty, unit)` in `src/app.js`
  returns `{ "total": <number> }`.
  - Below 100 units: no discount (e.g. `qty=10, unit=2` → `20`).
  - At 100+ units: 10% discount (e.g. `qty=100, unit=2` → `180`). Verified in
    `src/app.test.js`.

- **US-2 — Be rejected for an invalid quantity.** *As a calling system, I want a
  clear error when I send a non-positive quantity so that I don't act on a bad
  price.* → `qty <= 0` throws in `priceWidget`; the `/price` handler returns
  `400 { "error": "qty must be positive" }` (`src/app.js`,
  `docs/design/technical/API_CONTRACTS.md`).

- **US-3 — Check that the service is alive.** *As an ops operator, I want a liveness
  endpoint so my orchestrator can tell the process is up.* → `GET /health` returns
  `200 { "ok": true }` unconditionally (`src/app.js`).

- **US-4 — Run and verify the pricing logic.** *As a maintainer, I want to run the
  unit tests so I can trust the discount rule.* → `npm run test` → `node --test src/`
  exercises `priceWidget` (`package.json`, `src/app.test.js`).

---

## 6. Scope & Features

### In Scope (built and observable)

| Feature | Where it lives | Behavior |
|---------|----------------|----------|
| Discounted price calculation | `src/app.js → /price`, `priceWidget` | `qty × unit × (1 − discount)`, 10% off at `qty ≥ 100`, rounded to 2 decimals |
| Quantity validation | `src/app.js → priceWidget` | Throws on `qty <= 0`, surfaced as HTTP `400` |
| Liveness endpoint | `src/app.js → /health` | Always returns `{ ok: true }` |
| JSON HTTP interface | Express `res.json` | JSON responses over HTTP/1.1, `GET` only |
| Unit tests for pricing | `src/app.test.js` | Asserts no-discount, discount, and rejection paths |
| Importable module | `module.exports = { app, priceWidget }` | Server binds a port only when run directly, enabling test-without-listen |

### Out of Scope (verified absent in the code)

- **Bulk / multi-line-item pricing** (e.g. `GET /price/bulk?items=qty:unit,…`). This
  is **requested in GitHub issue #1 but is not implemented** in the current code —
  there is no `/price/bulk` route in `src/app.js`. Documented here as a gap, not as
  an existing feature. See §13 Open Questions.
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

- **FR-1 — Pricing formula.** For a valid request, the response total equals
  `qty × unit × (1 − discount)`, rounded to 2 decimal places.
- **FR-2 — Volume discount.** `discount = 0.10` when `qty >= 100`; otherwise
  `discount = 0`.
- **FR-3 — Quantity guard.** If `qty <= 0`, `priceWidget` throws
  `Error('qty must be positive')` and `/price` responds `400 { "error": "qty must be
  positive" }`.
- **FR-4 — Parameter parsing.** `qty` and `unit` are read from the query string and
  coerced with `Number(...)`.
- **FR-5 — Liveness.** `GET /health` returns `200 { "ok": true }` with no dependency
  checks.
- **FR-6 — Response format.** All successful responses are JSON via Express
  `res.json`.
- **FR-7 — Unknown routes.** Any path/method not defined returns Express's default
  `404` (no custom handler).

**Documented current edge behavior (not an intended requirement):** missing or
non-numeric `qty`/`unit` coerce to `NaN`; because `NaN <= 0` is `false`, the
positivity guard is bypassed and the response is `200 { "total": null }` rather than
a `400` (`API_CONTRACTS.md` → Error semantics; `TDD.md` §9). `unit` is not validated,
so zero/negative unit prices are accepted.

---

## 8. Non-Functional Requirements

Characteristics **as built** (from the TDDs):

- **Performance**: Pure in-memory arithmetic with no I/O; effectively constant-time
  per request. No downstream calls, DB, or cache (`SYSTEM_ARCHITECTURE.md` §3).
- **Scalability**: Stateless single Node process; horizontally replicable behind an
  external load balancer, though no such infrastructure is defined in the repo
  (`DEPLOYMENT_STRATEGY.md` → Topology).
- **Security**: No application-level controls — no auth, TLS-in-app, CORS, helmet,
  or rate limiting; both endpoints are public over plain HTTP
  (`SECURITY_DESIGN.md`).
- **Reliability / lifecycle**: No graceful shutdown (no `SIGTERM`/`SIGINT`
  handlers); in-flight requests are not drained on exit (`SYSTEM_ARCHITECTURE.md`
  §6).
- **Observability**: None — no logs, metrics, or traces
  (`DEPLOYMENT_STRATEGY.md`).
- **Configurability**: Port `3000` hardcoded; no environment-driven config.
- **Testability**: Server binds a port only when run directly, so `priceWidget` is
  unit-testable without a live server (`src/app.js`, `SYSTEM_ARCHITECTURE.md` §6).

---

## 9. User Experience & Design

**Not applicable — this is an API-only service with no frontend** (`TDD.md` §7,
`SYSTEM_ARCHITECTURE.md` §8). The "user experience" is the HTTP/JSON contract:

- Requests are plain `GET` calls with query parameters; responses are compact JSON
  objects (`{ "total": <number> }`, `{ "ok": true }`, or
  `{ "error": <message> }`).
- Error feedback for the one validated case is a `400` with a human-readable
  `error` string.
- There is no UI, no layout, no responsiveness or accessibility surface to document.

---

## 10. Assumptions, Dependencies & Constraints

**Reconstruction assumptions:**

- The README/comment framing ("internal", "pre-dates CoWeave adoption") is taken to
  mean the service is internal infrastructure wrapping pre-existing pricing logic.
- Personas are inferred from endpoint purpose because there is no in-code identity
  model.

**Real dependencies (from manifests):**

- Runtime: `express ^4.19.2` — the only production dependency (`package.json`).
- Tooling: Node.js built-in test runner (`node --test`); no third-party test deps.

**Constraints (as built):**

- Fixed listen port `3000` (not env-configurable).
- `GET`-only, JSON-only interface.
- No persistence — the service cannot remember anything between requests.

---

## 11. Risks & Mitigations

These derive directly from the Out-of-Scope gaps; the gaps *are* the risks.

| Risk | Basis | Mitigation status |
|------|-------|-------------------|
| Malformed input returns `200 { "total": null }` instead of an error | `NaN` pass-through (`API_CONTRACTS.md`, `TDD.md` §9) | **Unmitigated** — documented, not fixed |
| Unvalidated `unit` allows non-positive prices | `priceWidget` validates only `qty` | **Unmitigated** |
| No authentication — endpoints fully public | `SECURITY_DESIGN.md` | **Unmitigated** — relies on external network controls |
| No rate limiting — open compute endpoint | `SECURITY_DESIGN.md` | **Unmitigated** |
| Hardcoded port limits deployment flexibility | `SYSTEM_ARCHITECTURE.md` §6 | **Unmitigated** |
| No observability — hard to diagnose in production | `DEPLOYMENT_STRATEGY.md` | **Unmitigated** |
| No graceful shutdown — requests dropped on exit | `SYSTEM_ARCHITECTURE.md` §6 | **Unmitigated** |

> Note: The bulk-pricing endpoint requested in issue #1 is a **feature gap**, not a
> risk in the running product; it is tracked in §6 Out of Scope and §13.

---

## 12. Timeline & Milestones

**N/A — reconstructed from an existing implementation; no forward roadmap.** This
PRD documents the product as it exists at iteration 1 and does not fabricate a
delivery schedule.

---

## 13. Open Questions & Decisions

| # | Question | Current state / assumption | Impact if wrong |
|---|----------|----------------------------|-----------------|
| Q1 | GitHub issue #1 requests `GET /price/bulk?items=qty:unit,…`. Is this an existing feature? | **No** — not implemented in `src/app.js`. Documented as Out of Scope (§6). | If code is added later, §5–§7 gain a new capability; PRD must be re-run. |
| Q2 | Is the `NaN → { "total": null }` behavior intended? | Assumed **unintended** (a robustness gap), per TDD framing. | If intended, FR-3/§11 change from "risk" to "designed behavior". |
| Q3 | Should `unit` be validated (non-negative)? | No validation exists; assumed acceptable for trusted internal callers. | If required, a new functional requirement and a risk mitigation appear. |
| Q4 | Who are the real consumers of `/price`? | Inferred internal systems; no identity in code. | Persona section (§4) would be refined. |
| Q5 | Is port configurability required for deployment? | Assumed not (hardcoded `3000`). | Adds an NFR/config requirement if wrong. |

---

## 14. Appendix

### 14.1 Data Model (product view)

The service is **stateless with no persisted entities**. The only data are the
transient request/response values:

| Concept | Fields | Notes |
|---------|--------|-------|
| Pricing request | `qty` (number), `unit` (number) | Query-string inputs to `/price` |
| Pricing result | `total` (number, 2 dp) | Computed by `priceWidget` |
| Error | `error` (string) | Returned on `qty <= 0` |
| Health | `ok` (boolean) | Always `true` from `/health` |

No database schema exists (`DATABASE_SCHEMA.md` intentionally not written per
`TDD.md` §7).

### 14.2 API Surface (as implemented)

| Method | Path | Success | Error |
|--------|------|---------|-------|
| GET | `/health` | `200 { "ok": true }` | — |
| GET | `/price?qty=&unit=` | `200 { "total": <number> }` | `400 { "error": "qty must be positive" }` |

### 14.3 References & Source Citations

- Code: `src/app.js` (`priceWidget`, `/health`, `/price` handlers), `src/app.test.js`
  (pricing tests), `package.json`, `README.md`, `.gitignore`.
- Reconstructed TDDs: `docs/design/TDD.md`,
  `docs/design/technical/SYSTEM_ARCHITECTURE.md`,
  `docs/design/technical/API_CONTRACTS.md`,
  `docs/design/technical/SECURITY_DESIGN.md`,
  `docs/design/technical/DEPLOYMENT_STRATEGY.md`.
- Scope guidance (not a requirements source): GitHub issue #1 "Add bulk pricing
  endpoint".
