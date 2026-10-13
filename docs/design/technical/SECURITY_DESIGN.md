# Security Design — widget-service

> Reverse-engineered from `src/app.js` and `package.json`. This documents the
> security posture that **actually exists** in the code, plus the real threat
> surface. It is descriptive, not prescriptive.

## Summary

The service implements **no application-level security controls**. There is no
authentication, no authorization, no rate limiting, no `helmet`, no `cors`
configuration, no input-validation library, and no secret material anywhere in the
codebase. The only runtime dependency is `express` (`package.json`).

## Threat Surface (as implemented)

| Vector | Status in code | Notes |
|--------|----------------|-------|
| Authentication | **None** | No auth middleware; all three routes (`/health`, `/price`, `/price/bulk`) are fully public. |
| Authorization / RBAC | **None** | No role or permission checks. |
| Transport security (TLS) | **Not in app** | `app.listen(3000)` serves plain HTTP; TLS termination, if any, would be external (not present in repo). |
| Input validation | **Partial** | `priceWidget` enforces `qty > 0` **and** rejects non-finite (`±Infinity`) `qty`/`unit` on **both** `/price` and `/price/bulk` (the finiteness guard added for issue #1 — `../TDD.md` §D2a). `/price/bulk` additionally enforces per-token shape (`qty:unit`), per-field finiteness (rejects `NaN`/`±Infinity`), a 50-item cap, and a running-sum overflow guard (`../TDD.md` §D3/§D7). Inputs are coerced with `Number()`; on `/price` only, non-numeric input still yields the legacy `NaN → { "total": null }, 200` passthrough (see `API_CONTRACTS.md`). |
| CORS | **Unconfigured** | No `cors` middleware; browser cross-origin requests use Express defaults (no CORS headers set). |
| Security headers | **None** | No `helmet`; default Express headers only. |
| Rate limiting / DoS | **Partial (request-shape bound only)** | No throttling middleware. However, `/price/bulk` caps input at `MAX_BULK_ITEMS = 50` tokens (`src/app.js:31`), bounding per-request CPU/allocation — the mitigation `../TDD.md` §D7/§D10 identifies for the MEDIUM-severity "unbounded `items` → amplification" vector introduced by the bulk route. Work is otherwise O(N) pure arithmetic with no I/O. `/price` and `/health` remain unthrottled. |
| Secrets management | **N/A** | No secrets, API keys, tokens, or `process.env` reads exist in the code. |
| SQL/NoSQL injection | **N/A** | No database or query layer exists. |
| Body parsing risks | **N/A** | Endpoints are `GET`-only; no body parser is mounted. |

## Data Handling

- The service processes only two numeric query parameters (`qty`, `unit`) and
  returns a computed number. It stores nothing and logs nothing (no logging
  library is present). There is no PII, no persistence, and no external data
  transmission.

## Attack-relevant observations

- **Unauthenticated compute endpoints**: `/price` and `/price/bulk` are open to any
  caller. Because they perform only trivial arithmetic and hold no state, the
  primary risk is generic unauthenticated request volume rather than data exposure.
- **Bulk amplification (bounded)**: `/price/bulk` lets one request price up to 50
  line items. The `MAX_BULK_ITEMS = 50` cap (`src/app.js:31`) bounds the per-request
  work so a single call cannot trigger unbounded CPU/allocation; see the Rate
  limiting / DoS row above and `../TDD.md` §D7/§D10.
- **`NaN` pass-through (`/price` only)**: on `/price`, malformed non-numeric input
  does not error; it returns `{ "total": null }` with `200`. This is a
  correctness/robustness gap noted here and in the TDD "Observations & Risks", not
  an active vulnerability. `/price/bulk` deliberately does **not** inherit this —
  it rejects `NaN`/non-finite fields with `400` (`../TDD.md` §D3/Q2).

## Secrets Handling

Not applicable — the repository contains no credentials, tokens, keys, or
environment-driven secrets. `.gitignore` only excludes `node_modules/`.
