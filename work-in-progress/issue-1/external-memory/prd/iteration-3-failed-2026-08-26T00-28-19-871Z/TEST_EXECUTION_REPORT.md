# QA Test Execution Report — Iteration 3

**Sandbox:** `issue-1`
**Repository:** hershbhargava/cw-test-brownfield
**Branch:** feature/issue-1
**Duration:** 2.8s
**Exit code:** 0
**Status:** completed


## Summary

- **Total:** 28
- **Passed:** 28 (100%)
- **Failed:** 0
- **Skipped:** 0
- **Result source:** `infra-counts`

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
  duration_ms: 2.19496
  ...
# Subtest: applies 10% discount at 100+
ok 2 - applies 10% discount at 100+
  ---
  duration_ms: 0.262347
  ...
# Subtest: rejects non-positive qty
ok 3 - rejects non-positive qty
  ---
  duration_ms: 1.074046
  ...
# Subtest: bulk: sums discounted totals across line items
ok 4 - bulk: sums discounted totals across line items
  ---
  duration_ms: 80.298215
  ...
# Subtest: bulk: single line item
ok 5 - bulk: single line item
  ---
  duration_ms: 11.708019
  ...
# Subtest: bulk: applies per-line discount within one request
ok 6 - bulk: applies per-line discount within one request
  ---
  duration_ms: 10.947429
  ...
# Subtest: bulk: final rounding to 2 decimals
ok 7 - bulk: final rounding to 2 decimals
  ---
  duration_ms: 11.992711
  ...
# Subtest: bulk: rejects a line with non-positive qty (from priceWidget)
ok 8 - bulk: rejects a line with non-positive qty (from priceWidget)
  ---
  duration_ms: 14.71378
  ...
# Subtest: bulk: rejects malformed token (non-numeric)
ok 9 - bulk: rejects malformed token (non-numeric)
  ---
  duration_ms: 9.77845
  ...
# Subtest: bulk: rejects token missing the colon
ok 10 - bulk: rejects token missing the colon
  ---
  duration_ms: 11.299341
  ...
# Subtest: bulk: rejects token with too many colons
ok 11 - bulk: rejects token with too many colons
  ---
  duration_ms: 9.96505
  ...
# Subtest: bulk: rejects missing items param
ok 12 - bulk: rejects missing items param
  ---
  duration_ms: 9.183006
  ...
# Subtest: bulk: rejects empty items param
ok 13 - bulk: rejects empty items param
  ---
  duration_ms: 8.36402
  ...
# Subtest: bulk: rejects more than 50 items
ok 14 - bulk: rejects more than 50 items
  ---
  duration_ms: 7.851089
  ...
# Subtest: bulk: accepts exactly 50 items (boundary)
ok 15 - bulk: accepts exactly 50 items (boundary)
  ---
  duration_ms: 49.55482
  ...
# Subtest: bulk: rejects adjacent delimiters (empty token)
ok 16 - bulk: rejects adjacent delimiters (empty token)
  ---
  duration_ms: 10.427526
  ...
# Subtest: bulk: rejects trailing delimiter (empty token)
ok 17 - bulk: rejects trailing delimiter (empty token)
  ---
  duration_ms: 14.676633
  ...
# Subtest: bulk: rejects repeated items param (non-string)
ok 18 - bulk: rejects repeated items param (non-string)
  ---
  duration_ms: 8.821056
  ...
# Subtest: regression: /health still returns ok
ok 19 - regression: /health still returns ok
  ---
  duration_ms: 7.398728
  ...
# Subtest: regression: /price still computes discounted total
ok 20 - regression: /price still computes discounted total
  ---
  duration_ms: 7.342008
  ...
# Subtest: regression: /price still rejects non-positive qty
ok 21 - regression: /price still rejects non-positive qty
  ---
  duration_ms: 6.30944
  ...
# Subtest: bulk: rejects non-finite (Infinity) qty token
ok 22 - bulk: rejects non-finite (Infinity) qty token
  ---
  duration_ms: 6.267952
  ...
# Subtest: bulk: rejects non-finite (Infinity) unit token
ok 23 - bulk: rejects non-finite (Infinity) unit token
  ---
  duration_ms: 7.338998
  ...
# Subtest: price: rejects non-finite (Infinity) qty
ok 24 - price: rejects non-finite (Infinity) qty
  ---
  duration_ms: 5.116777
  ...
# Subtest: price: NaN qty still passes through as { total: null }, 200 (documented)
ok 25 - price: NaN qty still passes through as { total: null }, 200 (documented)
  ---
  duration_ms: 4.802955
  ...
# Subtest: regression: unknown route returns 404
ok 26 - regression: unknown route returns 404
  ---
  duration_ms: 7.607622
  ...
# Subtest: bulk: qty=99 gets no discount (just below threshold)
ok 27 - bulk: qty=99 gets no discount (just below threshold)
  ---
  duration_ms: 9.272327
  ...
# Subtest: bulk: negative unit price yields negative total (documented behavior)
ok 28 - bulk: negative unit price yields negative total (documented behavior)
  ---
  duration_ms: 4.89856
  ...
1..28
# tests 28
# suites 0
# pass 28
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 584.692006

```

## stderr (tail)

```
(empty)
```

## Report Files

(none collected)
