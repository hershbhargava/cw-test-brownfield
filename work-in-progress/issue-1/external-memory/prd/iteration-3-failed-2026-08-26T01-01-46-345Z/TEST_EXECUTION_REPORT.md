# QA Test Execution Report — Iteration 3

**Sandbox:** `issue-1`
**Repository:** hershbhargava/cw-test-brownfield
**Branch:** feature/issue-1
**Duration:** 4.7s
**Exit code:** 0
**Status:** completed


## Summary

- **Total:** 38
- **Passed:** 38 (100%)
- **Failed:** 0
- **Skipped:** 0
- **Result source:** `infra-counts`

## Coverage

- **Lines:** 100%
- **Branches:** 96.43%
- **Functions:** 100%
- **Statements:** 100%
- _source: `lcov`_

## stdout (tail)

```

added 68 packages, and audited 69 packages in 1s

15 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities

> widget-service@1.2.0 test
> node --test src/

TAP version 13
# Subtest: prices without discount under 100
ok 1 - prices without discount under 100
  ---
  duration_ms: 2.593264
  ...
# Subtest: applies 10% discount at 100+
ok 2 - applies 10% discount at 100+
  ---
  duration_ms: 0.306844
  ...
# Subtest: rejects non-positive qty
ok 3 - rejects non-positive qty
  ---
  duration_ms: 1.464039
  ...
# Subtest: bulk: sums discounted totals across line items
ok 4 - bulk: sums discounted totals across line items
  ---
  duration_ms: 122.813136
  ...
# Subtest: bulk: single line item
ok 5 - bulk: single line item
  ---
  duration_ms: 16.421742
  ...
# Subtest: bulk: applies per-line discount within one request
ok 6 - bulk: applies per-line discount within one request
  ---
  duration_ms: 13.803121
  ...
# Subtest: bulk: final rounding to 2 decimals
ok 7 - bulk: final rounding to 2 decimals
  ---
  duration_ms: 6.841702
  ...
# Subtest: bulk: rejects a line with non-positive qty (from priceWidget)
ok 8 - bulk: rejects a line with non-positive qty (from priceWidget)
  ---
  duration_ms: 20.103307
  ...
# Subtest: bulk: rejects malformed token (non-numeric)
ok 9 - bulk: rejects malformed token (non-numeric)
  ---
  duration_ms: 7.392696
  ...
# Subtest: bulk: rejects token missing the colon
ok 10 - bulk: rejects token missing the colon
  ---
  duration_ms: 6.595334
  ...
# Subtest: bulk: rejects token with too many colons
ok 11 - bulk: rejects token with too many colons
  ---
  duration_ms: 6.964229
  ...
# Subtest: bulk: rejects missing items param
ok 12 - bulk: rejects missing items param
  ---
  duration_ms: 10.771746
  ...
# Subtest: bulk: rejects empty items param
ok 13 - bulk: rejects empty items param
  ---
  duration_ms: 11.833748
  ...
# Subtest: bulk: rejects more than 50 items
ok 14 - bulk: rejects more than 50 items
  ---
  duration_ms: 24.114034
  ...
# Subtest: bulk: accepts exactly 50 items (boundary)
ok 15 - bulk: accepts exactly 50 items (boundary)
  ---
  duration_ms: 5.456702
  ...
# Subtest: bulk: rejects adjacent delimiters (empty token)
ok 16 - bulk: rejects adjacent delimiters (empty token)
  ---
  duration_ms: 5.29098
  ...
# Subtest: bulk: rejects trailing delimiter (empty token)
ok 17 - bulk: rejects trailing delimiter (empty token)
  ---
  duration_ms: 6.951406
  ...
# Subtest: bulk: rejects repeated items param (non-string)
ok 18 - bulk: rejects repeated items param (non-string)
  ---
  duration_ms: 27.54833
  ...
# Subtest: regression: /health still returns ok
ok 19 - regression: /health still returns ok
  ---
  duration_ms: 9.338451
  ...
# Subtest: regression: /price still computes discounted total
ok 20 - regression: /price still computes discounted total
  ---
  duration_ms: 8.524878
  ...
# Subtest: regression: /price still rejects non-positive qty
ok 21 - regression: /price still rejects non-positive qty
  ---
  duration_ms: 7.197917
  ...
# Subtest: bulk: rejects non-finite (Infinity) qty token
ok 22 - bulk: rejects non-finite (Infinity) qty token
  ---
  duration_ms: 22.817995
  ...
# Subtest: bulk: rejects non-finite (Infinity) unit token
ok 23 - bulk: rejects non-finite (Infinity) unit token
  ---
  duration_ms: 13.113208
  ...
# Subtest: price: rejects non-finite (Infinity) qty
ok 24 - price: rejects non-finite (Infinity) qty
  ---
  duration_ms: 5.73766
  ...
# Subtest: price: NaN qty still passes through as { total: null }, 200 (documented)
ok 25 - price: NaN qty still passes through as { total: null }, 200 (documented)
  ---
  duration_ms: 8.755456
  ...
# Subtest: regression: unknown route returns 404
ok 26 - regression: unknown route returns 404
  ---
  duration_ms: 8.064933
  ...
# Subtest: bulk: qty=99 gets no discount (just below threshold)
ok 27 - bulk: qty=99 gets no discount (just below threshold)
  ---
  duration_ms: 7.264663
  ...
# Subtest: bulk: negative unit price yields negative total (documented behavior)
ok 28 - bulk: negative unit price yields negative total (documented behavior)
  ---
  duration_ms: 8.478069
  ...
# Subtest: regression: POST /price is not handled (404, GET-only)
ok 29 - regression: POST /price is not handled (404, GET-only)
  ---
  duration_ms: 18.646189
  ...
# Subtest: regression: POST /price/bulk is not handled (404, GET-only)
ok 30 - regression: POST /price/bulk is not handled (404, GET-only)
  ---
  duration_ms: 4.82259
  ...
# Subtest: regression: PUT /price is not handled (404, GET-only)
ok 31 - regression: PUT /price is not handled (404, GET-only)
  ---
  duration_ms: 6.877611
  ...
# Subtest: regression: PUT /price/bulk is not handled (404, GET-only)
ok 32 - regression: PUT /price/bulk is not handled (404, GET-only)
  ---
  duration_ms: 4.393455
  ...
# Subtest: regression: DELETE /price is not handled (404, GET-only)
ok 33 - regression: DELETE /price is not handled (404, GET-only)
  ---
  duration_ms: 8.851295
  ...
# Subtest: regression: DELETE /price/bulk is not handled (404, GET-only)
ok 34 - regression: DELETE /price/bulk is not handled (404, GET-only)
  ---
  duration_ms: 6.861281
  ...
# Subtest: bulk: rejects an absurdly long digit-string qty token (overflow → Infinity)
ok 35 - bulk: rejects an absurdly long digit-string qty token (overflow → Infinity)
  ---
  duration_ms: 10.560483
  ...
# Subtest: bulk: rejects an absurdly long digit-string unit token (overflow → Infinity)
ok 36 - bulk: rejects an absurdly long digit-string unit token (overflow → Infinity)
  ---
  duration_ms: 4.576302
  ...
# Subtest: bulk: rejects a line with negative qty (distinct from zero)
ok 37 - bulk: rejects a line with negative qty (distinct from zero)
  ---
  duration_ms: 4.258225
  ...
# Subtest: price: negative unit price yields negative total (documented behavior)
ok 38 - price: negative unit price yields negative total (documented behavior)
  ---
  duration_ms: 5.046277
  ...
1..38
# tests 38
# suites 0
# pass 38
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 768.505046
----------|---------|----------|---------|---------|-------------------
File      | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
----------|---------|----------|---------|---------|-------------------
All files |     100 |    96.42 |     100 |     100 |                   
 app.js   |     100 |    96.42 |     100 |     100 | 66                
----------|---------|----------|---------|---------|-------------------

```

## stderr (tail)

```
(empty)
```

## Report Files

- /persistent/git-workspaces/hershbhargava/cw-test-brownfield/issue-1/repos/hershbhargava/cw-test-brownfield/work-in-progress/issue-1/external-memory/prd/iteration-3/reports/_artifacts/0/lcov.info
