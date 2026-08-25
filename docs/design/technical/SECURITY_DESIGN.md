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
| Authentication | **None** | No auth middleware; both routes are fully public. |
| Authorization / RBAC | **None** | No role or permission checks. |
| Transport security (TLS) | **Not in app** | `app.listen(3000)` serves plain HTTP; TLS termination, if any, would be external (not present in repo). |
| Input validation | **Minimal** | Only `qty > 0` is enforced (via `priceWidget`). Inputs are coerced with `Number()`; non-numeric input yields `NaN` (see `API_CONTRACTS.md`). |
| CORS | **Unconfigured** | No `cors` middleware; browser cross-origin requests use Express defaults (no CORS headers set). |
| Security headers | **None** | No `helmet`; default Express headers only. |
| Rate limiting / DoS | **None** | No throttling middleware. |
| Secrets management | **N/A** | No secrets, API keys, tokens, or `process.env` reads exist in the code. |
| SQL/NoSQL injection | **N/A** | No database or query layer exists. |
| Body parsing risks | **N/A** | Endpoints are `GET`-only; no body parser is mounted. |

## Data Handling

- The service processes only two numeric query parameters (`qty`, `unit`) and
  returns a computed number. It stores nothing and logs nothing (no logging
  library is present). There is no PII, no persistence, and no external data
  transmission.

## Attack-relevant observations

- **Unauthenticated compute endpoint**: `/price` is open to any caller. Because it
  performs only trivial arithmetic and holds no state, the primary risk is generic
  unauthenticated request volume rather than data exposure.
- **`NaN` pass-through**: malformed input does not error; it returns
  `{ "total": null }` with `200`. This is a correctness/robustness gap noted here
  and in the TDD "Observations & Risks", not an active vulnerability.

## Secrets Handling

Not applicable — the repository contains no credentials, tokens, keys, or
environment-driven secrets. `.gitignore` only excludes `node_modules/`.
