### Developer Iteration 3 — QA gap closures (test-only)

Addressed the three gaps from the QA Test Review by **adding regression tests only**.
The implementation already produced the correct/documented behavior for each; no
production code was changed.

**Tests added (8):**
- **HIGH** — `POST`/`PUT`/`DELETE` to `/price` and `/price/bulk` now asserted to return `404`
  (GET-only routes; matches `API_CONTRACTS.md` §Undefined routes).
- **MEDIUM** — 400-digit numeric qty/unit tokens on `/price/bulk` asserted to return `400`
  `invalid item` (long-digit overflow → `Infinity`, rejected by the `Number.isFinite` guard).
- **LOW** — `/price/bulk?items=-5:10` → `400 'qty must be positive'` (distinct from zero);
  `/price?qty=10&unit=-3` → `200 { total: -30 }` (documented unvalidated-unit behavior).

**Verification:** `node --test src/app.test.js` → **38 pass / 0 fail**, no regressions.

**Guardrails honored:** 28 passing tests preserved · no coverage command added to the
`package.json` `test` script · `/health`, `/price`, `/price/bulk` backward-compatible ·
no quality gate modified or weakened.
