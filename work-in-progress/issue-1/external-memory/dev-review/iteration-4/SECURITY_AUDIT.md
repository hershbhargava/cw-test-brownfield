# Security Audit — dev-review iteration 4

## Date: 2026-10-13T23:21:07.068Z
## Repository: hershbhargava/cw-test-brownfield · Issue #1
## Scope: `src/app.js` (all 3 routes: `/health`, `/price`, `/price/bulk`) vs. `docs/design/technical/SECURITY_DESIGN.md`

## Objective

Independently verify, via direct code inspection, that `SECURITY_DESIGN.md` (fixed by
developer iteration-4 for gap GAP-DIFF-003) now accurately reflects the actual security
posture of the code — not merely that the prose reads correctly.

## Findings

| Area | Claimed in `SECURITY_DESIGN.md` | Verified in code | Match |
|------|----------------------------------|-------------------|-------|
| Authentication | None on any of 3 routes | Confirmed: no auth middleware (`app.use`) of any kind registered on `app`; all 3 `app.get(...)` calls (`src/app.js:21,22,32`) are reached with no preceding guard. | ✅ |
| Authorization/RBAC | None | Confirmed: no role/permission checks anywhere in `src/app.js`. | ✅ |
| Transport security | Not in app; `app.listen(3000)` plain HTTP | Confirmed: `app.listen(3000)` (`src/app.js:74`), no TLS/https module imported. | ✅ |
| Input validation | Partial — finiteness guard on both endpoints; bulk adds shape/count/overflow checks | Confirmed line-by-line: finiteness guard `src/app.js:10-14` (used by both `/price` and `/price/bulk` via shared `priceWidget`); bulk-specific: item cap `:41-43`, token shape `:47-49`, per-field finiteness `:54-56`, aggregate overflow `:63-65`. | ✅ |
| CORS | Unconfigured, Express defaults | Confirmed: no `cors` package in `package.json` dependencies, no `Access-Control-*` header set anywhere in `src/app.js`. | ✅ |
| Security headers | None, default Express only | Confirmed: no `helmet` package in `package.json`, no manual header-setting code. | ✅ |
| Rate limiting/DoS | Partial — `/price/bulk` bounded by `MAX_BULK_ITEMS=50`; `/price`/`/health` unthrottled | Confirmed: `const MAX_BULK_ITEMS = 50;` (`src/app.js:31`) enforced at `:41-43`; no throttling middleware (e.g. `express-rate-limit`) present anywhere, and no such package in `package.json`. | ✅ |
| Secrets management | N/A — no secrets/env reads | Confirmed via full-file read and grep: zero `process.env` references, zero hardcoded credential-shaped strings, zero API keys/tokens in `src/app.js`, `src/app.test.js`, `package.json`. | ✅ |
| SQL/NoSQL injection | N/A — no DB/query layer | Confirmed: no database client package in `package.json` dependencies (only `express`); no query-building code anywhere. | ✅ |
| Body parsing risks | N/A — GET-only, no body parser | Confirmed: all 3 routes are `app.get(...)`; no `express.json()`/`express.urlencoded()`/body-parser middleware registered. | ✅ |

**Result: 0 mismatches between `SECURITY_DESIGN.md` and the actual code.** This
corroborates (does not merely re-trust) the developer's GAP-DIFF-003 fix.

## Additional Independent Checks (beyond what `SECURITY_DESIGN.md` claims)

- **Error-message information disclosure**: every error response returns only
  `{ error: e.message }` with developer-authored static strings (see
  `CODE_QUALITY_REPORT.md` for the full string list). No stack traces, file paths, or
  internal object state are ever serialized into an HTTP response. ✅ Safe.
- **ReDoS / unbounded regex**: no regular expressions are used anywhere in `src/app.js`
  (parsing uses plain `String.prototype.split`); no ReDoS surface exists. ✅ Safe.
- **Prototype pollution via query parsing**: Express's default `qs`-based query parser
  can produce nested objects from bracket-notation query strings (e.g. `?a[b]=1`), but
  every value this code reads (`req.query.qty`, `req.query.unit`, `req.query.items`) is
  immediately passed through `Number(...)` or `typeof x === 'string'` checks before use;
  no property of `req.query` is ever used as a dynamic key, enumerated, or merged into
  another object. No prototype-pollution sink exists. ✅ Safe.
- **Resource exhaustion via `items` string length**: the 50-item token cap
  (`src/app.js:41-43`) bounds iteration count, but the cap is applied to
  `tokens.length` *after* `raw.split(',')` — meaning an attacker could still submit an
  arbitrarily long raw `items` string provided it splits into ≤50 comma-separated
  tokens (e.g. 50 tokens of enormous digit strings like `1e400:1e400`, which was in fact
  one of the QA-review regression tests, per `src/app.test.js` iteration-6 closure
  tests). This does not bypass any guard — `Number('1e400')` evaluates to `Infinity`,
  which is caught by the per-field finiteness check at `src/app.js:54-56` and rejected
  with `400`. This was already identified and mitigated prior to this review (TDD.md
  §D7/§D10); re-verified here as still correctly enforced. No new finding.
- **Express version**: `express ^4.19.2` (`package.json`) — this is a maintained,
  patched major version at time of review; no known unpatched CVEs are flagged by this
  audit (a full `npm audit` / dependency-CVE scan is out of scope for this
  code-level review but is recommended as a periodic CI check — see
  `DEPLOYMENT_STRATEGY.md`, which documents no CI pipeline currently exists).

## Gate-Integrity Note

This audit did not find any previously-configured security gate, scan, or lint rule to
have been weakened, disabled, or removed — none exist in this repository's CI/tooling to
begin with (confirmed: no `.github/workflows/`, no `npm audit` script, no SAST config).
This absence is a pre-existing characteristic of the repository (documented in
`DEPLOYMENT_STRATEGY.md`'s "CI/CD: Not present" section), not something this review or
the prior developer iteration introduced or hid.

## Conclusion

**0 CRITICAL, 0 HIGH, 0 MEDIUM, 0 LOW security gaps found.** `SECURITY_DESIGN.md`
accurately reflects the code's actual (minimal, by-design) security posture. No security
remediation is required for issue #1.
