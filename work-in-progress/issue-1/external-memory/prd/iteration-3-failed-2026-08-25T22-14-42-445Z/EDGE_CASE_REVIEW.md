# Edge Case Review — Issue #1, Iteration 3 (post-fix)

## Boundary values

| Case | Tested? | Result |
|---|---|---|
| `qty` exactly at discount threshold (100) | ✅ | `applies 10% discount at 100+` |
| `qty` just below threshold (99) | ✅ | `bulk: qty=99 gets no discount` (fixed this iteration) |
| `qty` exactly 0 | ✅ | rejected (both endpoints) |
| `qty` negative (e.g. -5) | ⚠️ Not explicitly tested (shares code path with 0; see GAP-N1) |
| `items` list exactly at cap (50) | ✅ | `bulk: accepts exactly 50 items (boundary)` |
| `items` list one over cap (51) | ✅ | `bulk: rejects more than 50 items` |
| Empty `items` | ✅ | rejected |
| Single-item bulk request | ✅ | `bulk: single line item` |

## Error scenarios

| Case | Tested? |
|---|---|
| Non-numeric token (`abc:2`) | ✅ |
| Token missing `:` | ✅ |
| Token with extra `:` | ✅ |
| Adjacent delimiters → empty token | ✅ |
| Trailing delimiter → empty token | ✅ |
| Non-string `items` (repeated query param → array) | ✅ |
| `Infinity`-producing token (`1e400`) — bulk qty/unit | ✅ (fixed + tested this iteration) |
| `Infinity`-producing qty — `/price` | ✅ (fixed + tested this iteration) |
| `NaN` on `/price` (legacy passthrough) | ✅ (locked in this iteration) |
| Unknown route | ✅ (tested this iteration; Express default 404) |

## Numeric coercion edge cases (new findings, LOW severity — see TEST_GAP_ANALYSIS.md GAP-N1..N3)

`Number()` is used directly for both `qty` and `unit` parsing on both
endpoints. `Number()` has coercion behaviors beyond plain decimal digits that
are not currently exercised by any test:

- **Hex/octal/binary literals**: `Number("0x10")` → `16`. A bulk token like
  `0x10:2` is accepted as `qty=16` rather than rejected as malformed input.
- **Whitespace tolerance**: `Number(" 10 ")` → `10`. A token with
  leading/trailing spaces around a number is accepted.
- **Negative values**: covered by the same `qty <= 0` guard as zero, but no
  test asserts a *negative* (as opposed to zero) quantity specifically.

None of these produce incorrect arithmetic or a security issue (the CPU/
memory-amplification concern is bounded by the existing 50-item cap,
TDD.md §D7/D10) — they are silent-acceptance-of-unusual-input gaps, not
correctness bugs. Recorded as optional LOW-severity strengthening tests in
`ITERATION-4-GUIDANCE.md`.

## Permission / auth edge cases

Not applicable — TDD.md §6/§D7 confirms no auth/security controls exist for
this service by design; out of scope for issue #1.

## Concurrency

Not applicable — `priceWidget` is a pure function and each `/price/bulk`
request is independently computed with no shared mutable state; no
concurrency-specific test is warranted.

## Empty / large inputs

| Case | Tested? |
|---|---|
| Empty `items` string | ✅ |
| >50 items (amplification bound) | ✅ |
| Very long individual token / very large (but finite) numeric value | Not tested — LOW priority; the 50-item cap already bounds total work, and `priceWidget`'s arithmetic has no overflow guard beyond the (now-fixed) `Infinity` rejection. |

## Summary

All edge cases required by TDD.md/PRD.md and all edge cases raised by the
prior QA review are now covered. This review's incremental findings
(GAP-N1–N3) are minor numeric-coercion completeness items, not defects —
none are blocking.
