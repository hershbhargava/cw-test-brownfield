# Gap Fixes Summary — Iteration 3 (Developer)

Addresses the QA Test Review gaps (prior review artifacts under `prd/iteration-3/`) and the
special-instruction items. The QA review's HIGH finding was promoted by the Architecture iteration
into a formal TDD requirement (**Q2a**), so it is fixed here in code (not just tested).

| Gap ID / Source | Severity | Description | Fix | Verification |
|---|---|---|---|---|
| **Q2a** (TDD §D3, from QA review HIGH) | HIGH | `/price/bulk` running sum of ≤50 individually-finite line totals can overflow to `Infinity` → serialized as `{ "total": null }` with `200`. | Added accumulator guard `if (!Number.isFinite(total)) return res.status(400).json({ error: 'total is too large' });` inside the loop, after `total += priceWidget(...)` — `src/app.js:63-65`. | New test `src/app.test.js:272-277` (50× `1e307:1` → `400 { error: 'total is too large' }`) passes. Manually reproduced pre-fix: `200 {"total":null}`; post-fix: `400`. |
| **SI-1** (special_instructions) | HIGH | Assert non-GET verbs rejected (POST/PUT/DELETE to `/price` and `/price/bulk` → 404). | Already implemented in commit `44a5a86`; verified present — loop over `['POST','PUT','DELETE']` × 2 routes = 6 tests, `src/app.test.js:212-222`. | 6 tests pass (`ok 29`–`ok 34` in the run). No code change needed (Express registers GET-only). |
| **SI-2** (special_instructions) | MEDIUM | Oversized single numeric token (`1e400`, absurdly long digit string) rejected with 400 on `/price/bulk`. | Already implemented; verified present — `src/app.test.js:159-169` (`1e400`) and `:230-242` (400-digit strings). Covered by the existing per-line `Number.isFinite` guard (`src/app.js:54`). | Tests pass (`ok 22`, `ok 23`, `ok 35`, `ok 36`). No code change needed. |
| **SI-3** (special_instructions) | LOW | Negative-qty test on `/price/bulk` (`items=-5:10` → 400) distinct from zero; negative-unit test on `/price` (`qty=10&unit=-3`). | Already implemented; verified present — `src/app.test.js:247-251` and `:256-260`. | Tests pass (`ok 37`, `ok 38`). No code change needed. |

## Net changes this iteration

- **Code:** `src/app.js` — 1 additive guard (8 lines incl. comment), `src/app.js:58-65`. No existing
  branch modified; `/price`, `/health`, and `priceWidget` untouched.
- **Tests:** `src/app.test.js` — 1 new test, `src/app.test.js:262-277`. Suite goes 38 → 39 tests.
- **Local verification:** `node --check` clean on both files; `node --test src/app.test.js` → 39/39 pass.
- **No gate/config touched:** `package.json`, eslint, tsconfig unchanged (GATE-INTEGRITY compliant).

## Note on backward compatibility

Q2a only adds a *new* rejection path for inputs that previously produced a nonsensical
`{ "total": null }, 200`. No previously-valid request changes behavior: any bulk request whose sum
stays finite (all existing passing tests) is unaffected — the guard's false-branch is exercised by
all 15+ passing bulk cases.
