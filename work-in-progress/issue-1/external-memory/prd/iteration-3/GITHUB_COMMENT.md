## 🔧 Developer TDD Iteration 3 — Bulk widget pricing (`GET /price/bulk`)

**Issue**: #1
**Branch**: `feature/issue-1`
**Named test**: `src/app.test.js`

### What the spec required
`src/app.test.js` asserts a `GET /price/bulk?items=q:u,q:u,…` endpoint that reuses
the existing `priceWidget` per line item, sums the discounted line totals into the
existing `{ total }` envelope, and is all-or-nothing: any malformed token, empty
token, non-positive qty, missing/empty/repeated `items` param, or more than 50
items returns `400` with a specific error body. It also asserts `/health` and
`/price` are unchanged.

### What I changed
- (none) — the implementation already present in `src/app.js` satisfies every
  assertion in the named test.

### Outcome
Test passes on first run: `node --test src/` → `# tests 21 / # pass 21 / # fail 0`.
The `/price/bulk` handler (validation guards, `Number.isNaN` reject, per-line
`priceWidget` reuse, 2-decimal rounding) plus the untouched `priceWidget`,
`/health`, and `/price` routes match each asserted status and body verbatim,
including the exact error strings (`"invalid item '<token>'"`, `'items is required'`,
`'too many items (max 50)'`, `'qty must be positive'`). Per the minimal-change
rule, no code was modified and no refactor was performed this iteration.

**Next**: qa-test-execution-workflow verifies the full suite.
