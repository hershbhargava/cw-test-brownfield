# QA Test Execution Report — Iteration 3

**Sandbox:** `issue-1`
**Repository:** hershbhargava/cw-test-brownfield
**Branch:** feature/issue-1
**Duration:** 3.2s
**Exit code:** 0
**Status:** completed


## Summary

- **Total:** 21
- **Passed:** 21 (100%)
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
  duration_ms: 1.774117
  ...
# Subtest: applies 10% discount at 100+
ok 2 - applies 10% discount at 100+
  ---
  duration_ms: 0.20945
  ...
# Subtest: rejects non-positive qty
ok 3 - rejects non-positive qty
  ---
  duration_ms: 0.339696
  ...
# Subtest: bulk: sums discounted totals across line items
ok 4 - bulk: sums discounted totals across line items
  ---
  duration_ms: 84.284646
  ...
# Subtest: bulk: single line item
ok 5 - bulk: single line item
  ---
  duration_ms: 14.72883
  ...
# Subtest: bulk: applies per-line discount within one request
ok 6 - bulk: applies per-line discount within one request
  ---
  duration_ms: 9.346248
  ...
# Subtest: bulk: final rounding to 2 decimals
ok 7 - bulk: final rounding to 2 decimals
  ---
  duration_ms: 10.478061
  ...
# Subtest: bulk: rejects a line with non-positive qty (from priceWidget)
ok 8 - bulk: rejects a line with non-positive qty (from priceWidget)
  ---
  duration_ms: 12.527866
  ...
# Subtest: bulk: rejects malformed token (non-numeric)
ok 9 - bulk: rejects malformed token (non-numeric)
  ---
  duration_ms: 8.751326
  ...
# Subtest: bulk: rejects token missing the colon
ok 10 - bulk: rejects token missing the colon
  ---
  duration_ms: 8.896644
  ...
# Subtest: bulk: rejects token with too many colons
ok 11 - bulk: rejects token with too many colons
  ---
  duration_ms: 6.376711
  ...
# Subtest: bulk: rejects missing items param
ok 12 - bulk: rejects missing items param
  ---
  duration_ms: 15.227506
  ...
# Subtest: bulk: rejects empty items param
ok 13 - bulk: rejects empty items param
  ---
  duration_ms: 7.980034
  ...
# Subtest: bulk: rejects more than 50 items
ok 14 - bulk: rejects more than 50 items
  ---
  duration_ms: 7.579085
  ...
# Subtest: bulk: accepts exactly 50 items (boundary)
ok 15 - bulk: accepts exactly 50 items (boundary)
  ---
  duration_ms: 6.767003
  ...
# Subtest: bulk: rejects adjacent delimiters (empty token)
ok 16 - bulk: rejects adjacent delimiters (empty token)
  ---
  duration_ms: 31.153234
  ...
# Subtest: bulk: rejects trailing delimiter (empty token)
ok 17 - bulk: rejects trailing delimiter (empty token)
  ---
  duration_ms: 12.698094
  ...
# Subtest: bulk: rejects repeated items param (non-string)
ok 18 - bulk: rejects repeated items param (non-string)
  ---
  duration_ms: 12.143383
  ...
# Subtest: regression: /health still returns ok
ok 19 - regression: /health still returns ok
  ---
  duration_ms: 6.869737
  ...
# Subtest: regression: /price still computes discounted total
ok 20 - regression: /price still computes discounted total
  ---
  duration_ms: 5.276167
  ...
# Subtest: regression: /price still rejects non-positive qty
ok 21 - regression: /price still rejects non-positive qty
  ---
  duration_ms: 9.525162
  ...
1..21
# tests 21
# suites 0
# pass 21
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 500.293854

```

## stderr (tail)

```
(empty)
```

## Report Files

(none collected)
