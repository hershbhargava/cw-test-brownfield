# Technical Design Document — widget-service

> **Mode**: Reverse-engineered from the existing implementation (documents what
> **IS**, not what should be). Iteration 1.
> **Primary source files**: `src/app.js`, `src/app.test.js`, `package.json`,
> `README.md`, `.gitignore`.

## 1. Purpose & Scope

`widget-service` is an internal, stateless HTTP microservice that computes a
discounted widget price. It exposes a liveness endpoint and a pricing endpoint.
The pricing rule (`priceWidget`) predates the current tooling adoption (per the
inline comment in `src/app.js`: "Existing business logic — pre-dates CoWeave
adoption.").

This TDD is the master document. Detailed views live under `docs/design/technical/`:

- [`SYSTEM_ARCHITECTURE.md`](technical/SYSTEM_ARCHITECTURE.md) — module layout, request flow, process model.
- [`API_CONTRACTS.md`](technical/API_CONTRACTS.md) — endpoint request/response shapes and status codes.
- [`SECURITY_DESIGN.md`](technical/SECURITY_DESIGN.md) — the (minimal) security posture that exists.
- [`DEPLOYMENT_STRATEGY.md`](technical/DEPLOYMENT_STRATEGY.md) — build/run/test and the deployment gaps.

Subsystems that **do not exist** in this codebase (and therefore have no dedicated
doc): database/persistence, inter-service communication, and event-driven
messaging. See §7.

## 2. Technology Stack (as implemented)

| Concern | Choice | Evidence |
|---------|--------|----------|
| Language | JavaScript (CommonJS) | `require`/`module.exports` in `src/app.js` |
| Runtime | Node.js | `node src/app.js`, `node --test` in `package.json` |
| Web framework | Express `^4.19.2` | sole dependency in `package.json` |
| Test runner | Built-in `node:test` + `node:assert` | `src/app.test.js`, `test` script |
| Build tooling | None | no bundler/transpiler present |
| Persistence | None | no DB driver/ORM in deps or code |

Package: `widget-service` v1.2.0 (`package.json`).

## 3. Architecture (summary)

A single Node process runs one Express app defined entirely in `src/app.js`. Two
`GET` routes are registered directly on the `app` instance. Domain logic is a pure
function, `priceWidget`, invoked by the `/price` handler. There is no layering into
routes/controllers/services, no data-access layer, and no downstream dependencies.

```
HTTP GET ──▶ Express app (src/app.js)
              ├─ GET /health  → { ok: true }
              └─ GET /price   → priceWidget(qty, unit) → { total }
                                 (throws → 400 { error })
```

The server only binds a port when the file is run directly
(`if (require.main === module) app.listen(3000)`), which keeps the pure function
importable and testable without a live server. Full detail in
[`SYSTEM_ARCHITECTURE.md`](technical/SYSTEM_ARCHITECTURE.md).

## 4. Domain Logic — `priceWidget(qty, unitPrice)`

Implemented in `src/app.js`:

- Guard: `qty <= 0` throws `Error('qty must be positive')`.
- Discount: `qty >= 100` → 10% off; otherwise 0%.
- Total: `qty * unitPrice * (1 - discount)`, rounded to 2 decimals via `toFixed(2)`
  and re-coerced to a number with the unary `+`.

Verified by `src/app.test.js`:
- `priceWidget(10, 2) === 20` (no discount below 100)
- `priceWidget(100, 2) === 180` (10% discount at 100+)
- `priceWidget(0, 2)` throws.

## 5. API Surface (summary)

| Method | Path | Success | Error |
|--------|------|---------|-------|
| GET | `/health` | `200 { "ok": true }` | — |
| GET | `/price?qty=&unit=` | `200 { "total": <number> }` | `400 { "error": "qty must be positive" }` |

Response bodies are JSON (Express `res.json`). No custom 404 or central error
middleware exists; unknown routes get Express's default `404`. Full detail in
[`API_CONTRACTS.md`](technical/API_CONTRACTS.md).

## 6. Cross-Cutting Concerns (as implemented)

- **Config**: none — port `3000` is hardcoded; no `process.env`, `dotenv`, or
  `config/`.
- **Auth/Security**: none — public endpoints, no TLS/CORS/helmet/rate-limiting.
  See [`SECURITY_DESIGN.md`](technical/SECURITY_DESIGN.md).
- **Logging/Observability**: none — no logger, metrics, or tracing.
- **Error handling**: local `try/catch` in the `/price` handler only.
- **Lifecycle**: no graceful shutdown / signal handling.

## 7. Not Applicable — verified absent

| Subsystem | Status | Basis |
|-----------|--------|-------|
| Database / persistence | Not applicable | No DB driver/ORM in `package.json`; no queries, models, migrations, or schema files anywhere. `DATABASE_SCHEMA.md` intentionally not written. |
| Inter-service communication | Not applicable | No outbound HTTP/gRPC/queue clients; no service discovery. `SERVICE_CONTRACTS.md` intentionally not written. |
| Event-driven messaging | Not applicable | No producers/consumers, topics, or brokers. `EVENT_SCHEMA.md` intentionally not written. |
| Frontend | Not applicable | API-only service. |

## 8. Build, Run & Test

- Install: `npm install` (`node_modules/` git-ignored).
- Run: `npm run start` → `node src/app.js` (listens on :3000).
- Test: `npm run test` → `node --test src/` (unit tests over `priceWidget`).

Deployment details and the absence of Docker/CI/IaC are documented in
[`DEPLOYMENT_STRATEGY.md`](technical/DEPLOYMENT_STRATEGY.md).

## 9. Observations & Risks (from the code, not fixes)

1. **Malformed input returns `{ "total": null }` with `200`.** Missing/non-numeric
   `qty`/`unit` coerce to `NaN`; `NaN <= 0` is `false` so the positivity guard is
   bypassed, and `(+NaN).toFixed(2)` serializes to JSON `null`. Correctness/
   robustness gap (see `API_CONTRACTS.md`), documented not remediated.
2. **`unit` is unvalidated.** Negative or zero unit prices are accepted and produce
   correspondingly non-positive totals.
3. **Hardcoded port `3000`** — not environment-configurable, limiting deployment
   flexibility.
4. **No security controls** — endpoints are fully public over plain HTTP (see
   `SECURITY_DESIGN.md`).
5. **No observability** — no logs/metrics/tracing, making production diagnosis
   difficult.
6. **No graceful shutdown** — in-flight requests are not drained on process exit.
7. **`/health` is unconditional** — it always returns `ok:true` and checks nothing
   (acceptable given there are no dependencies to check).

## 10. Coverage

This codebase consists of two source files totaling ~33 lines. All of it has been
read and documented. Coverage is **complete** for this repository at iteration 1;
see `metadata.json` for the machine-readable ledger.

---

# Architecture Delta — Issue #1: Add Bulk Pricing Endpoint

> **Mode**: New feature on the existing application (TDD DIFF). This section is
> **additive** to the baseline above (§1–§10, which document what IS). It specifies
> ONLY the architectural change introduced by issue #1 and its ripple effects. The
> baseline sections remain the authoritative description of the unchanged system.
>
> **Issue**: #1 "Add bulk pricing endpoint" · **Branch**: `feature/issue-1` ·
> **Upstream**: `docs/requirements/PRD_DELTA_issue-1.md`.
> **Source requirement** (issue #1): *"Add `GET /price/bulk?items=qty:unit,qty:unit`
> that returns the summed discounted total across line items, reusing the existing
> priceWidget logic. Include tests."*

## D1. Change Summary

Add one new read-only route, **`GET /price/bulk`**, to the existing Express app in
`src/app.js`. It parses a comma-separated `items` list of `qty:unit` line items,
prices each line with the **existing, unmodified** `priceWidget` pure function, and
returns the summed discounted total using the existing `{ "total": <number> }`
envelope.

- **Complexity**: **Low.** Single additive route; no new module, layer, dependency,
  data store, or change to `priceWidget`.
- **Affected boundaries**: API surface (one added `GET` route) and the test suite
  (new `node:test` cases). Nothing else.
- **Backward compatibility**: **Fully preserved.** `GET /price` and `GET /health` are
  byte-for-byte unchanged. The new route is inert until called. No API versioning is
  required (purely additive — see PRD_DELTA §5.3).

## D2. Existing Architecture Context (what this touches)

| Baseline element | Reference | Delta relationship |
|------------------|-----------|--------------------|
| `priceWidget(qty, unitPrice)` pure function | §4, `src/app.js` | **Reused as-is.** Called once per line item. Not modified. |
| Route registration on the single `app` instance | §3, `src/app.js` | **Extended.** One new `app.get('/price/bulk', …)` added alongside `/health` and `/price`. |
| Local `try/catch` → `400 { error }` pattern | §6, API_CONTRACTS §"Error semantics" | **Followed.** The new handler uses the same local error-handling idiom; no central error middleware is introduced. |
| Response envelope `{ "total": <number> }` | §5, API_CONTRACTS §2 | **Reused** for consistency. |
| No persistence / no downstream deps | §7 | **Unchanged.** Bulk pricing is pure in-memory O(N) arithmetic; stays stateless. |

## D3. Resolved Design Decisions (PRD_DELTA §9 open questions)

The PRD delta left six contract details open (Q1–Q6). As these are API-structure and
error-semantics choices within the architect's remit, they are resolved here to make
the contract implementation-ready. The governing principles are **consistency with
the existing `/price` contract** and **minimal added surface**.

| ID | Decision | Rationale |
|----|----------|-----------|
| **Q1 — Envelope** | Success returns `200 { "total": <sum> }`. No per-line breakdown. | Matches `/price` exactly (§5); keeps the contract minimal. A breakdown can be added later additively if a consumer needs it. |
| **Q2 — Invalid line / NaN** | Any malformed token or a line failing `priceWidget`'s guard (`qty <= 0`) **rejects the whole request** with `400 { "error": <message> }`. `NaN` (non-numeric `qty`/`unit`) is **rejected explicitly** with `400` — deliberately stricter than `/price`'s documented `NaN → { total: null }, 200` pass-through (§9.1). | All-or-nothing avoids silently dropping/mis-summing lines. Rejecting `NaN` prevents an aggregate `total` of `null`, which would be a nonsensical bulk result. This is an intentional, localized deviation from the legacy `/price` quirk; `/price` itself is unchanged. |
| **Q3 — Max items** | Cap at **50** line items. Exceeding it returns `400 { "error": "too many items (max 50)" }`. | Bounds per-request work and the unbounded-`items` DoS surface (PRD_DELTA §5.5). 50 comfortably covers realistic baskets while capping abuse. |
| **Q4 — Empty / missing `items`** | Missing or empty `items` returns `400 { "error": "items is required" }`. | A bulk price request with nothing to price is a client error; explicit `400` is clearer than an ambiguous `{ total: 0 }`. |
| **Q5 — Delimiters** | `,` separates line items; `:` separates `qty` and `unit`, exactly as the issue example. Callers must URL-encode the `items` value; a token must contain exactly one `:`. | Honors the issue's literal request shape; documenting encoding avoids caller confusion. |
| **Q6 — Rounding** | Sum the already-rounded per-line `priceWidget` outputs, then round the sum once more to 2 decimals via `+(...).toFixed(2)`. | Reuses `priceWidget`'s existing rounding per line; the final round guards against floating-point summation artifacts (e.g. `0.1 + 0.2`). |

## D4. Proposed Change — `GET /price/bulk`

**Component**: API surface (route handler in `src/app.js`).
**Change Type**: **New** (additive route).
**Before**: No bulk/multi-line pricing exists; callers issue N× `GET /price` and sum
client-side (PRD_DELTA §3).
**After**: One `GET /price/bulk?items=qty:unit,…` call returns the server-summed total.

**Handler responsibilities** (pseudocode — implementation is left to the build phase):

```
GET /price/bulk
  1. raw = req.query.items
  2. if raw is missing/empty  → 400 { error: "items is required" }
  3. tokens = raw.split(',')
  4. if tokens.length > 50    → 400 { error: "too many items (max 50)" }
  5. for each token:
       a. parts = token.split(':')
       b. if parts.length !== 2 → 400 { error: "invalid item '<token>'" }
       c. qty = Number(parts[0]); unit = Number(parts[1])
       d. if Number.isNaN(qty) || Number.isNaN(unit)
                                 → 400 { error: "invalid item '<token>'" }
       e. lineTotal = priceWidget(qty, unit)   // reuses existing guard + discount
     (priceWidget throwing on qty<=0 is caught → 400 { error: e.message })
  6. sum = Σ lineTotal
  7. res.json({ total: +(sum).toFixed(2) })     // 200
```

The whole body is wrapped in the same local `try/catch → 400 { error: e.message }`
idiom used by `/price`, so a thrown `priceWidget` guard (e.g. `qty must be positive`)
surfaces as `400 { "error": "qty must be positive" }`, mirroring the existing
contract.

**Layering note**: consistent with the baseline (§3), no new routes/controllers/
services layering is introduced for a single additive handler. `priceWidget` remains
the sole domain function. If the file grows, extracting a small `parseItems` helper is
acceptable but not required by this change.

## D5. Data Model Changes

**None.** The service is stateless with no database (§7). No schema, table, index,
migration, or data transformation is involved. `DATABASE_SCHEMA.md` remains
intentionally absent.

## D6. API Contract Changes

**New endpoint** (full contract added to `technical/API_CONTRACTS.md` §3):

| Method | Path | Success | Error |
|--------|------|---------|-------|
| **GET** | **`/price/bulk?items=qty:unit,…`** | `200 { "total": <summed number> }` | `400 { "error": <message> }` |

**Worked examples**:
- `GET /price/bulk?items=10:2,100:2` → `200 { "total": 200 }` (line 1: `10×2` = 20, no
  discount; line 2: `100×2` with 10% off = 180; sum = 200).
- `GET /price/bulk?items=10:2` → `200 { "total": 20 }`.
- `GET /price/bulk?items=0:2` → `400 { "error": "qty must be positive" }`.
- `GET /price/bulk?items=abc:2` → `400 { "error": "invalid item 'abc:2'" }`.
- `GET /price/bulk` (no `items`) → `400 { "error": "items is required" }`.

**Backward compatibility**: additive only. `/price` and `/health` contracts are
unchanged; **no versioning** required.

## D7. Security Impact

- **Posture unchanged** — the endpoint is a public, unauthenticated compute route like
  the others (`SECURITY_DESIGN.md`). No auth, TLS, or CORS is added by this change
  (out of scope per PRD.md §6).
- **New surface — unbounded input (mitigated).** A large `items` string is the only
  new attack surface. The **50-item cap (D3/Q3)** bounds per-request CPU/allocation,
  mitigating a trivial amplification/DoS vector. Beyond the cap, work is O(N) pure
  arithmetic with no I/O.
- **Input handling**: tokens are split and numerically coerced; non-numeric input is
  rejected (D3/Q2) rather than propagated. No `eval`, no dynamic property access, no
  injection sink is introduced (values flow only into arithmetic).

## D8. Infrastructure & Deployment Impact

- **None new.** Same single Node process, same `npm run start`, same hardcoded port
  (§6, `DEPLOYMENT_STRATEGY.md`). No new resource, dependency, or scaling change.
- **Rollout**: no feature flag required — an additive, inert-until-called read route.
  A dark-launch flag is optional and not needed.
- **Rollback**: revert the single commit adding the route + tests. No data or
  compatibility consequences (stateless, additive); callers simply fall back to N×
  `/price`.

## D9. Testing Strategy for the Change

New cases extend `src/app.test.js` in the existing `node:test` + `node:assert` style.
Because `app` is exported, route tests can drive the handler in-process (Express
`app` is a request listener) without binding a port — consistent with the baseline's
importable design (§3). The test surface stays within `src/`, so **`.coweave/
manifest.yml` needs no change** (`npm install && npm test` already covers it).

**New-behavior tests (required by issue #1)**:
1. **Sum correctness** — `items=10:2,100:2` → `total === 200`.
2. **Single line** — `items=10:2` → `total === 20`.
3. **Per-line discount** — a `qty ≥ 100` line is discounted, a `< 100` line is not,
   within one bulk call (e.g. `items=100:2,10:2` → `200`).
4. **Invalid line rejection** — `items=0:2` → `400` with an `error` message.
5. **Malformed token** — `items=abc:2` and `items=10` (missing `:`) → `400`.
6. **Missing/empty `items`** — `GET /price/bulk` and `?items=` → `400 items is required`.
7. **Over-cap** — an `items` list of 51 entries → `400 too many items`.
8. **Rounding** — a case whose per-line sum needs the final round (e.g. floating-point
   artifact) confirms 2-decimal output.

**Regression (must not break)**:
- The three existing `priceWidget` unit tests still pass.
- `GET /price?qty=&unit=` — unchanged totals, discount, and `400` on `qty <= 0`.
- `GET /health` — still `{ "ok": true }`.

## D10. Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Unbounded `items` → CPU/memory amplification | MEDIUM | 50-item cap returns `400` (D3/Q3). |
| Divergence from `/price` `NaN` behavior confuses callers | LOW | Deliberate, documented (D3/Q2 + API_CONTRACTS); bulk rejects `NaN` to avoid a `null` aggregate. `/price` itself is untouched. |
| Floating-point summation error in `total` | LOW | Final `+(sum).toFixed(2)` round (D3/Q6). |
| Accidental change to `priceWidget` while wiring the route | LOW | `priceWidget` is reused unchanged; existing unit tests act as a regression guard. |

## D11. Delta Coverage

This delta covers the full architectural impact of issue #1: one additive route, no
data/infra/security-posture changes, backward-compatible, with the six open contract
questions resolved (D3) and a regression-aware test plan (D9). Implementation-ready.
