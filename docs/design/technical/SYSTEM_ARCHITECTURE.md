# System Architecture — widget-service

> Reverse-engineered from the implementation. Documents what **exists**, not what should exist.
> Source of truth: `src/app.js`, `src/app.test.js`, `package.json`, `README.md`.

## 1. Overview

`widget-service` is a single-process, stateless HTTP microservice written in
JavaScript on Node.js using the Express 4 framework. It exposes three HTTP `GET`
endpoints: a liveness check (`/health`), a single-line discounted widget price
(`/price`), and a bulk/multi-line summed price (`/price/bulk`, added for issue #1 —
see `../TDD.md` §D4). There is no persistence layer, no authentication, no external
service dependency, and no background/async work — the entire runtime is one small
Express app.

- **Name / version**: `widget-service` v1.2.0 (`package.json`)
- **Runtime**: Node.js, CommonJS modules (`require`/`module.exports`)
- **Framework**: Express `^4.19.2` (the only runtime dependency, `package.json`)
- **Entrypoint**: `src/app.js`
- **Listen port**: `3000`, hardcoded (`src/app.js` → `app.listen(3000)`)
- **Architecture style**: single stateless microservice (per README)

## 2. Module / File Inventory

| Path | Role |
|------|------|
| `src/app.js` | Entire application: business logic (`priceWidget`), Express app, route handlers, and conditional server bootstrap. Exports `{ app, priceWidget }`. |
| `src/app.test.js` | Unit tests for `priceWidget` using the built-in `node:test` runner + `node:assert`. |
| `package.json` | Manifest: name/version, `start` and `test` scripts, single dependency (express). |
| `README.md` | One-paragraph description and endpoint summary. |
| `.gitignore` | Ignores `node_modules/`. |

There are no subdirectories under `src/` beyond these two files. There is no
`config/`, no `routes/`, no `controllers/`, no `services/` layering — everything is
inline in `src/app.js`.

## 3. Component Boundaries (as implemented)

```
                 ┌─────────────────────────────────────────────────────────────┐
   HTTP client ──▶  Express app (src/app.js)                                    │
   (GET only)   │   ┌───────────────┐ ┌───────────────┐ ┌───────────────────┐  │
                │   │ GET /health   │ │ GET /price    │ │ GET /price/bulk   │  │
                │   │ → {ok:true}   │ │ → priceWidget │ │ → priceWidget per │  │
                │   │               │ │   (qty,unit)  │ │   line, sum (≤50) │  │
                │   └───────────────┘ └───────┬───────┘ └─────────┬─────────┘  │
                │                             │                   │            │
                │                             ▼                   ▼            │
                │                      priceWidget(qty,unit)  ◀────┘            │
                │                      (pure function — now 2 callers)         │
                └─────────────────────────────────────────────────────────────┘
                          (no DB, no cache, no downstream calls)
```

- **HTTP layer**: three Express route handlers registered directly on the `app`
  instance (`app.get('/health', ...)`, `app.get('/price', ...)`,
  `app.get('/price/bulk', ...)`).
- **Domain logic**: `priceWidget(qty, unitPrice)` — a pure, side-effect-free
  function that predates the current tooling adoption (comment in `src/app.js`:
  "Existing business logic — pre-dates CoWeave adoption."). It now has **two
  callers**: the `/price` handler (once per request) and the `/price/bulk` handler
  (once per line item, up to `MAX_BULK_ITEMS = 50`).
- **No data-access layer** — nothing is persisted or read from storage.

## 4. Request Flow

### `GET /price?qty=&unit=`
1. Express matches the route in `src/app.js`.
2. Handler reads `req.query.qty` and `req.query.unit` and coerces both with
   `Number(...)`.
3. Calls `priceWidget(qty, unit)` inside a `try/catch`.
4. On success responds `200` with `{ total: <number> }`.
5. On thrown error responds `400` with `{ error: <message> }`.

### `GET /price/bulk?items=qty:unit,...`
1. Express matches the route in `src/app.js`.
2. Handler reads `req.query.items`. If it is not a non-empty string (missing, empty,
   or coerced to an array/object by a repeated/bracket param), responds `400` with
   `{ error: "items is required" }`.
3. Splits `items` on `,` into tokens. If the token count exceeds `MAX_BULK_ITEMS`
   (50), responds `400` with `{ error: "too many items (max 50)" }`.
4. Iterates each token (all-or-nothing — any failure rejects the whole request):
   a. Splits the token on `:`; if it is not exactly two parts, responds `400` with
      `{ error: "invalid item '<token>'" }`.
   b. Coerces `qty`/`unit` with `Number(...)`; if either is `NaN` or non-finite
      (`±Infinity`, e.g. `1e400`), responds `400` with `{ error: "invalid item
      '<token>'" }` (stricter than `/price` by design — see `../TDD.md` §D3/Q2).
   c. Prices the line via `priceWidget(qty, unit)` inside the handler's `try/catch`
      (so a `qty <= 0` throw surfaces as `400 { error: "qty must be positive" }`)
      and adds the result to a running sum.
   d. Re-validates the running sum with `Number.isFinite`; if it overflows to
      `Infinity`, responds `400` with `{ error: "total is too large" }` (the
      aggregate-overflow guard — `../TDD.md` §D3/Q2a).
5. On success responds `200` with `{ total: +sum.toFixed(2) }` (rounded once at the
   end).

### `GET /health`
1. Express matches the route.
2. Responds `200` with `{ ok: true }`. No dependency checks are performed — it is a
   pure liveness signal.

## 5. Business Rule (`priceWidget`)

Implemented in `src/app.js` → `priceWidget`:
- Rejects non-finite input: a `qty` or `unitPrice` that is a non-`NaN` non-finite
  number (`±Infinity`) throws `Error('qty and unit must be finite')` (added for
  issue #1 — `../TDD.md` §D2a; `NaN` is intentionally left to pass through so
  `/price` keeps its documented `NaN → { total: null }, 200` behavior).
- Rejects non-positive quantity: `if (qty <= 0) throw new Error('qty must be positive')`.
- Applies a **10% discount when `qty >= 100`**, otherwise no discount.
- Returns `qty * unitPrice * (1 - discount)` rounded to 2 decimals
  (`+(...).toFixed(2)`).

Confirmed by tests in `src/app.test.js`:
- `priceWidget(10, 2) === 20` (no discount below 100)
- `priceWidget(100, 2) === 180` (10% discount at 100+)
- `priceWidget(0, 2)` throws.

## 6. Process & Config Model

- **Config**: none. There is no `dotenv`, no `config/` directory, and no reads of
  `process.env` anywhere in the code. The port `3000` is a literal.
- **Bootstrap**: `if (require.main === module) app.listen(3000);` — the server only
  binds a port when `src/app.js` is executed directly (`npm run start`). When
  imported (e.g. by the test file) it does **not** listen, allowing the pure
  function to be tested without a live server.
- **Concurrency**: single Node process; no clustering, PM2, or worker threads.
- **Shutdown**: no graceful-shutdown handling (no `SIGTERM`/`SIGINT` handlers).

## 7. Runtime / Build

- `npm run start` → `node src/app.js` (starts the HTTP server on :3000).
- `npm run test` → `node --test src/` (runs the built-in test runner over `src/`).
- No transpilation/bundling step (plain CommonJS JavaScript, no build tooling).

## 8. Not Applicable (verified absent in code)

- **Database / persistence** — none. See `DATABASE_SCHEMA` note in the TDD.
- **Inter-service communication** — no outbound HTTP/gRPC/queue clients.
- **Event-driven messaging** — no producers/consumers or brokers.
- **Frontend** — none; this is an API-only service.
