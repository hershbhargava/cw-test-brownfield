# API Contracts — widget-service

> Reverse-engineered from `src/app.js`. Every endpoint below is defined literally
> in that file. There is no OpenAPI/proto/GraphQL schema in the repository; this
> document is the reconstructed contract from the route handlers themselves.

- **Base URL**: `http://<host>:3000` (port hardcoded in `src/app.js`)
- **Protocol**: HTTP/1.1, JSON responses (`res.json(...)`)
- **Methods used**: `GET` only
- **Auth**: none (see `SECURITY_DESIGN.md`)
- **Content-Type of responses**: `application/json` (Express `res.json` default)

## Endpoints

### 1. `GET /health`

Liveness probe. Always returns success; performs no dependency checks.

- **Request**: no parameters, no body.
- **Response `200 OK`**:
  ```json
  { "ok": true }
  ```
- **Errors**: none produced by the handler.

Defined in `src/app.js`:
`app.get('/health', (_req, res) => res.json({ ok: true }))`.

---

### 2. `GET /price`

Computes the discounted total for a given quantity and unit price.

- **Query parameters**:

  | Name  | Type   | Required | Notes |
  |-------|--------|----------|-------|
  | `qty` | number | yes      | Coerced via `Number(req.query.qty)`. Must be `> 0` or the request fails with `400`. |
  | `unit`| number | yes      | Coerced via `Number(req.query.unit)`. Interpreted as the per-unit price. |

- **Behavior** (`priceWidget` in `src/app.js`):
  - `qty <= 0` → throws → `400`.
  - `qty >= 100` → 10% discount applied.
  - `qty < 100` → no discount.
  - Result = `qty * unit * (1 - discount)` rounded to 2 decimals.

- **Response `200 OK`**:
  ```json
  { "total": 180 }
  ```
  (example: `?qty=100&unit=2` → `180`)

- **Response `400 Bad Request`** (thrown by `priceWidget`):
  ```json
  { "error": "qty must be positive" }
  ```

Defined in `src/app.js`:
```js
app.get('/price', (req, res) => {
  const qty = Number(req.query.qty), unit = Number(req.query.unit);
  try { res.json({ total: priceWidget(qty, unit) }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
```

---

### 3. `GET /price/bulk` *(added — issue #1, see TDD.md §D4/§D6)*

> **Status**: Designed (not yet implemented). Contract fixed by the architecture
> delta in `../TDD.md` (Architecture Delta §D3–D6). This is a **new, additive**
> route — `/price` and `/health` above are unchanged.

Computes the **summed** discounted total across multiple line items in one request,
pricing each line with the existing `priceWidget` (10% discount at `qty ≥ 100`).

- **Query parameters**:

  | Name    | Type   | Required | Notes |
  |---------|--------|----------|-------|
  | `items` | string | yes      | Comma-separated list of `qty:unit` tokens, e.g. `10:2,100:2`. URL-encode the value. Each token must contain exactly one `:`. Max **50** items. |

- **Behavior**:
  - Split `items` on `,`; each token split on `:` into `qty` and `unit` (coerced via `Number(...)`).
  - Price each line with `priceWidget(qty, unit)` (per-line 10% discount at `qty ≥ 100`; `qty <= 0` throws).
  - After adding each line total, re-validate the running sum with `Number.isFinite`; if it overflows to `Infinity`, reject with `400` (see `total is too large` below).
  - Return the sum of line totals, rounded once to 2 decimals: `+(sum).toFixed(2)`.

- **Response `200 OK`**:
  ```json
  { "total": 200 }
  ```
  (example: `?items=10:2,100:2` → line 1 `10×2`=20, line 2 `100×2` −10%=180, sum=200)

- **Response `400 Bad Request`** (any of, all-or-nothing — the whole request fails):
  ```json
  { "error": "items is required" }        // missing or empty items
  { "error": "too many items (max 50)" }  // more than 50 tokens
  { "error": "invalid item '<token>'" }   // malformed token or NaN qty/unit
  { "error": "qty must be positive" }     // a line with qty <= 0 (from priceWidget)
  { "error": "total is too large" }       // running sum of valid lines overflows to Infinity
  ```

- **Deliberate divergence from `/price`**: unlike `/price`, non-numeric (`NaN`)
  `qty`/`unit` are **rejected with `400`** rather than passed through to
  `{ "total": null }, 200`. This avoids a nonsensical `null` aggregate. `/price`
  itself is unchanged. Rationale in `../TDD.md` §D3 (Q2).

## Error semantics (as implemented)

- The only explicit error path is the `400` from `priceWidget` when `qty <= 0`.
- The error body is `{ "error": <Error.message> }`.
- There is **no** central Express error-handling middleware
  (`(err, req, res, next)`); error handling is local to the `/price` handler's
  `try/catch`.
- **Observed edge behavior (documented, not a recommendation):** missing or
  non-numeric `qty`/`unit` coerce to `NaN`. `NaN <= 0` is `false`, so the
  positivity guard does **not** trip; the computation returns `NaN`, and
  `(+NaN).toFixed(2)` yields the JSON value `null` in the response
  `{ "total": null }` with status `200`. This reflects current behavior, not
  intended design.

## Undefined routes

Any path/method not listed above (e.g. `POST /price`, `GET /unknown`) falls
through to Express's default handler and returns `404` — there is no custom
not-found handler in the code.
