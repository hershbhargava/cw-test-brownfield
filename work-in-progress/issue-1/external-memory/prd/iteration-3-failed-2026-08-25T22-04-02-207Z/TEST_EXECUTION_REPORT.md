# QA Test Execution Report — Iteration 3

**Sandbox:** `issue-1`
**Repository:** hershbhargava/cw-test-brownfield
**Branch:** feature/issue-1
**Duration:** 3.1s
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

added 68 packages, and audited 69 packages in 2s

15 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities

> widget-service@1.2.0 test
> node --test src/

TAP version 13
# Subtest: prices without discount under 100
ok 1 - prices without discount under 100
  ---
  duration_ms: 1.780926
  ...
# Subtest: applies 10% discount at 100+
ok 2 - applies 10% discount at 100+
  ---
  duration_ms: 0.216154
  ...
# Subtest: rejects non-positive qty
ok 3 - rejects non-positive qty
  ---
  duration_ms: 1.014625
  ...
# Subtest: bulk: sums discounted totals across line items
ok 4 - bulk: sums discounted totals across line items
  ---
  duration_ms: 87.159354
  ...
# Subtest: bulk: single line item
ok 5 - bulk: single line item
  ---
  duration_ms: 12.327371
  ...
# Subtest: bulk: applies per-line discount within one request
ok 6 - bulk: applies per-line discount within one request
  ---
  duration_ms: 17.933618
  ...
# Subtest: bulk: final rounding to 2 decimals
ok 7 - bulk: final rounding to 2 decimals
  ---
  duration_ms: 8.952656
  ...
# Subtest: bulk: rejects a line with non-positive qty (from priceWidget)
ok 8 - bulk: rejects a line with non-positive qty (from priceWidget)
  ---
  duration_ms: 9.273678
  ...
# Subtest: bulk: rejects malformed token (non-numeric)
ok 9 - bulk: rejects malformed token (non-numeric)
  ---
  duration_ms: 13.74312
  ...
# Subtest: bulk: rejects token missing the colon
ok 10 - bulk: rejects token missing the colon
  ---
  duration_ms: 11.357795
  ...
# Subtest: bulk: rejects token with too many colons
ok 11 - bulk: rejects token with too many colons
  ---
  duration_ms: 7.1271
  ...
# Subtest: bulk: rejects missing items param
ok 12 - bulk: rejects missing items param
  ---
  duration_ms: 9.41127
  ...
# Subtest: bulk: rejects empty items param
ok 13 - bulk: rejects empty items param
  ---
  duration_ms: 10.568503
  ...
# Subtest: bulk: rejects more than 50 items
ok 14 - bulk: rejects more than 50 items
  ---
  duration_ms: 7.386608
  ...
# Subtest: bulk: accepts exactly 50 items (boundary)
ok 15 - bulk: accepts exactly 50 items (boundary)
  ---
  duration_ms: 19.035128
  ...
# Subtest: bulk: rejects adjacent delimiters (empty token)
ok 16 - bulk: rejects adjacent delimiters (empty token)
  ---
  duration_ms: 32.016549
  ...
# Subtest: bulk: rejects trailing delimiter (empty token)
ok 17 - bulk: rejects trailing delimiter (empty token)
  ---
  duration_ms: 8.135191
  ...
# Subtest: bulk: rejects repeated items param (non-string)
ok 18 - bulk: rejects repeated items param (non-string)
  ---
  duration_ms: 5.381935
  ...
# Subtest: regression: /health still returns ok
ok 19 - regression: /health still returns ok
  ---
  duration_ms: 6.333454
  ...
# Subtest: regression: /price still computes discounted total
ok 20 - regression: /price still computes discounted total
  ---
  duration_ms: 5.219403
  ...
# Subtest: regression: /price still rejects non-positive qty
ok 21 - regression: /price still rejects non-positive qty
  ---
  duration_ms: 4.915405
  ...
# Subtest: bulk: rejects non-finite (Infinity) qty token
ok 22 - bulk: rejects non-finite (Infinity) qty token
  ---
  duration_ms: 4.436468
  ...
# Subtest: bulk: rejects non-finite (Infinity) unit token
ok 23 - bulk: rejects non-finite (Infinity) unit token
  ---
  duration_ms: 3.550396
  ...
# Subtest: price: rejects non-finite (Infinity) qty
ok 24 - price: rejects non-finite (Infinity) qty
  ---
  duration_ms: 4.208082
  ...
# Subtest: price: NaN qty still passes through as { total: null }, 200 (documented)
ok 25 - price: NaN qty still passes through as { total: null }, 200 (documented)
  ---
  duration_ms: 5.353076
  ...
# Subtest: regression: unknown route returns 404
ok 26 - regression: unknown route returns 404
  ---
  duration_ms: 5.094842
  ...
# Subtest: bulk: qty=99 gets no discount (just below threshold)
ok 27 - bulk: qty=99 gets no discount (just below threshold)
  ---
  duration_ms: 4.279764
  ...
# Subtest: bulk: negative unit price yields negative total (documented behavior)
ok 28 - bulk: negative unit price yields negative total (documented behavior)
  ---
  duration_ms: 5.146687
  ...
1..28
# tests 28
# suites 0
# pass 28
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 525.814893

```

## stderr (tail)

```
(empty)
```

## Report Files

(none collected)
