# System Architecture — widget-service

> Reverse-engineered from the implementation. Documents what **exists**, not what should exist.
> Source of truth: `src/app.js`, `src/app.test.js`, `package.json`, `README.md`.

## 1. Overview

`widget-service` is a single-process, stateless HTTP microservice written in
JavaScript on Node.js using the Express 4 framework. It exposes two HTTP `GET`
endpoints for a liveness check and for computing a discounted widget price. There
is no persistence layer, no authentication, no external service dependency, and no
background/async work — the entire runtime is one small Express app.

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
                 ┌───────────────────────────────────────────┐
   HTTP client ──▶  Express app (src/app.js)                  │
   (GET only)   │   ┌───────────────┐   ┌───────────────────┐ │
                │   │ GET /health   │   │ GET /price        │ │
                │   │ → {ok:true}   │   │ → priceWidget()   │ │
                │   └───────────────┘   └─────────┬─────────┘ │
                │                                  ▼           │
                │                        priceWidget(qty,unit) │
                │                        (pure function)       │
                └───────────────────────────────────────────┘
                          (no DB, no cache, no downstream calls)
```

- **HTTP layer**: two Express route handlers registered directly on the `app`
  instance (`app.get('/health', ...)`, `app.get('/price', ...)`).
- **Domain logic**: `priceWidget(qty, unitPrice)` — a pure, side-effect-free
  function that predates the current tooling adoption (comment in `src/app.js`:
  "Existing business logic — pre-dates CoWeave adoption.").
- **No data-access layer** — nothing is persisted or read from storage.

## 4. Request Flow

### `GET /price?qty=&unit=`
1. Express matches the route in `src/app.js`.
2. Handler reads `req.query.qty` and `req.query.unit` and coerces both with
   `Number(...)`.
3. Calls `priceWidget(qty, unit)` inside a `try/catch`.
4. On success responds `200` with `{ total: <number> }`.
5. On thrown error responds `400` with `{ error: <message> }`.

### `GET /health`
1. Express matches the route.
2. Responds `200` with `{ ok: true }`. No dependency checks are performed — it is a
   pure liveness signal.

## 5. Business Rule (`priceWidget`)

Implemented in `src/app.js` → `priceWidget`:
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
