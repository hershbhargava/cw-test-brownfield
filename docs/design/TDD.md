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
