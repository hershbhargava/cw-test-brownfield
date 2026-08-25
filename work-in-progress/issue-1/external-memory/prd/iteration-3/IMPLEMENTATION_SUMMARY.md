# Developer TDD Iteration 3 — Implementation Summary

## Named test
`src/app.test.js`

## What the test asserts
The test file exercises `priceWidget` (3 unit assertions) and the Express `app`
over an ephemeral port (18 HTTP assertions) covering `GET /price/bulk` success
paths (summing per-line discounted totals, single item, per-line discount, final
2-decimal rounding), all-or-nothing error paths (non-positive qty, malformed
tokens, missing colon, too many colons, missing/empty `items`, >50 items, exactly
50 boundary, empty tokens from adjacent/trailing delimiters, repeated `items`
param → non-string), and regressions for `/health`, `/price` success and `/price`
rejection. It reaches for the `{ app, priceWidget }` exports of `./app`.

## Implementation gap identified
None. The production code in `src/app.js` — the `/price/bulk` handler
(lines 21–50) plus the unchanged `priceWidget` (lines 4–8) and existing
`/health`, `/price` routes — already satisfies every assertion in the named
test. Running `node --test src/` yields `# pass 21 / # fail 0`, so `src/app.test.js`
passes on first run. No minimal change was required, and per the workflow's
"smallest production change" and "do NOT refactor beyond what the test requires"
rules, no change was made.

## Files modified
- (none) — the named test already passes against the existing implementation.

## Why this satisfies the assertion
The `/price/bulk` handler validates the `items` param (string/non-empty guard,
≤50 tokens, exactly-two-numeric-parts-per-token, `Number.isNaN` reject), reuses
`priceWidget` per line (which throws `'qty must be positive'` on `qty <= 0`,
caught into a 400 envelope), sums line totals, and returns `{ total }` rounded to
2 decimals — matching each asserted status code and body verbatim, including the
`"invalid item '<token>'"`, `'items is required'`, `'too many items (max 50)'`,
and `'qty must be positive'` error strings.

## First-run result
Test now passes: `node --test src/` → `# tests 21 / # pass 21 / # fail 0`.
The named test file `src/app.test.js` is green with zero production changes this
iteration. (Iteration status: `completed`, `loc_changed: 0`.)
