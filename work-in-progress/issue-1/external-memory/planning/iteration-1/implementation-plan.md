# Implementation Plan - Add Bulk Pricing Endpoint

**Initiative**: GitHub Issue #1 "Add bulk pricing endpoint"
**Kind**: New Feature (Additive)
**PRD Source**: `docs/requirements/PRD_DELTA_issue-1.md`
**TDD Source**: `docs/design/TDD.md` (Architecture Delta §D1-D11)
**Stacks**: `nodejs` (Express 4)
**Mode**: NEW (retroactive — feature already implemented and shipped)

---

## Overview

This implementation plan decomposes the bulk pricing endpoint feature (GitHub issue #1) into vertical, independently deliverable slices. The feature adds a single new HTTP endpoint, `GET /price/bulk`, that accepts multiple line items in a query parameter and returns the summed discounted total, reusing the existing `priceWidget` pricing logic.

The work is decomposed into three vertical slices that build from foundational input handling and validation, through core pricing logic reuse, to comprehensive edge-case hardening. Each slice delivers end-to-end, user-visible value that can be independently tested and demonstrated.

The initiative is backend-only (Express route handlers in `src/app.js`) with no frontend component. All slices target the `nodejs` stack and build on the existing Node.js/Express architecture. The sequencing follows a natural dependency order: basic endpoint → comprehensive validation → edge-case hardening, with each slice extending the previous one's capabilities.

**Note**: This plan is retroactive documentation. The feature was implemented in a single development effort (commits `fcd74b2`..`e6e6a8d`) and is currently shipped with 100% test coverage (39/39 tests passing). This plan reconstructs how the work *could have been* decomposed into incremental slices for educational and process-documentation purposes.

---

## Estimate rollup

**Total effort**: ~5-7 days (M slice + S slice + M slice)
**Critical path length**: 3 slices sequential (B1 → B2 → B3)
**Note**: Estimates are relative hints, not commitments. Actual implementation took 4 commits across the feature branch.

---

## Risks & sequencing notes

**Key risks**:
1. **Aggregate overflow**: Up to 50 individually-finite line items can sum past `Number.MAX_VALUE` to `Infinity`, which serializes as JSON `null`. Mitigated in B3 with running-sum guard.
2. **Contract divergence from `/price`**: The bulk endpoint deliberately rejects `NaN` inputs (stricter than `/price`'s legacy `NaN → null` passthrough) to prevent nonsensical aggregates. Requires careful testing to ensure intentional divergence doesn't regress `/price` behavior.
3. **Shared `priceWidget` modification**: Adding the finiteness guard to the shared pricing function affects both `/price` and `/price/bulk`. Changes must preserve `/price`'s existing `NaN` passthrough while tightening `Infinity` handling.

**Sequencing rationale**:
- B1 establishes the happy path (basic endpoint + sum logic), providing immediate demonstrable value
- B2 layers on comprehensive input validation, making the endpoint production-ready for well-formed requests
- B3 adds edge-case hardening (overflow guards, non-finite handling), addressing the subtle numeric edge cases identified in the TDD

All slices are sequential with no parallelization opportunities, as each builds directly on the previous implementation.

---

## Backlog

```yaml
slices:
  - id: B1
    title: "Basic bulk pricing endpoint with multi-line summation"
    scope: "Implement the core `GET /price/bulk` route handler that parses a comma-separated `items` query parameter (format: `qty:unit,qty:unit,...`), invokes the existing `priceWidget` function for each line item, sums the discounted per-line totals, and returns `200 { total: <sum> }` rounded to 2 decimals. Include happy-path tests: single line, multiple lines with mixed discount eligibility (one line qty<100, one line qty>=100), and basic sum correctness. Error handling limited to `priceWidget` exceptions (qty<=0) surfaced as 400."
    stacks: [nodejs]
    estimate: "M · ~2-3 days"
    depends_on: []
    acceptance:
      - "`GET /price/bulk?items=10:2,100:2` returns `{ total: 200 }` (line 1: 20, line 2: 180 with 10% discount)"
      - "`GET /price/bulk?items=50:1` returns `{ total: 50 }` (single line, no discount)"
      - "`GET /price/bulk?items=100:2,50:1` correctly applies per-line discount (180 + 50 = 230)"
      - "Negative/zero qty on any line returns 400 with error message from `priceWidget`"
      - "Existing `/price` and `/health` endpoints unchanged and regression-tested"

  - id: B2
    title: "Comprehensive input validation and error handling"
    scope: "Extend B1 with production-grade input validation: enforce `items` presence (missing/empty → 400 'items is required'), cap at MAX_BULK_ITEMS=50 (excess → 400 'too many items (max 50)'), validate token structure (each must be exactly `qty:unit` with one colon → 400 'invalid item'), reject NaN fields from malformed tokens (stricter than `/price`'s legacy NaN passthrough → 400 'invalid item'), and implement all-or-nothing semantics (any invalid line rejects the whole request with no partial result). Add final-round guard for floating-point summation artifacts via `+total.toFixed(2)`. Comprehensive test coverage: empty/missing items, 50-item boundary (exactly 50 accepted, 51 rejected), malformed tokens (no colon, multiple colons, adjacent delimiters), NaN from non-numeric input, repeated `items` param edge case."
    stacks: [nodejs]
    estimate: "S · ~1-2 days"
    depends_on: [B1]
    acceptance:
      - "Missing `items` parameter returns `400 { error: 'items is required' }`"
      - "51-item request returns `400 { error: 'too many items (max 50)' }`; exactly 50 items succeeds"
      - "Malformed tokens (`abc:2`, `10`, `10:2:3`, adjacent commas) return `400 { error: 'invalid item <token>' }`"
      - "Non-numeric qty/unit (e.g. `items=abc:2`) returns 400, not 200 with null total"
      - "Floating-point artifact case (`items=1:0.1,1:0.2`) returns `{ total: 0.3 }` not 0.30000000000000004"

  - id: B3
    title: "Non-finite input hardening and aggregate overflow guard"
    scope: "Add two-layer finiteness enforcement to prevent nonsensical null totals: (1) Per-line layer - modify the shared `priceWidget` to reject non-finite (±Infinity) qty/unit inputs with 'qty and unit must be finite' error (careful scoping: guard checks `!isNaN && !isFinite` so `/price`'s legacy NaN→null passthrough is preserved, only Infinity is tightened); extend bulk token validation to reject Infinity fields as 'invalid item'. (2) Aggregate layer - add running-sum overflow guard that re-validates the accumulator with `Number.isFinite` after each line addition; on overflow to Infinity return `400 { error: 'total is too large' }` fail-fast. Comprehensive edge-case tests: Infinity input on `/price` (now 400, was 200 null), Infinity input on `/price/bulk` (400 invalid item), 50x large finite values that sum to Infinity (400 'total is too large'), regression that `/price` with NaN still returns 200 null, 400-digit string overflow detection."
    stacks: [nodejs]
    estimate: "M · ~2 days"
    depends_on: [B2]
    acceptance:
      - "`GET /price?qty=1e400&unit=2` returns `400 { error: 'qty and unit must be finite' }` (Infinity tightening)"
      - "`GET /price?qty=abc&unit=2` still returns `200 { total: null }` (NaN passthrough preserved)"
      - "`GET /price/bulk?items=1e400:2` returns `400 { error: 'invalid item ...' }` (per-line Infinity rejection)"
      - "50 individually-finite items whose sum overflows (e.g. `1e307:1` x50) returns `400 { error: 'total is too large' }`"
      - "All existing `/price` and `/health` tests pass (regression guard for shared `priceWidget` change)"
```
