# Implementation Plan — Iteration 3 (Developer)

**Issue:** #1 — `GET /price/bulk?items=qty:unit,qty:unit` (summed discounted total across line items).
**Mode:** CONTINUATION (iteration 3). Additive new-feature workflow.

## Document change analysis (git diff since QA review f8d9ee8 → HEAD)

The **Architecture iteration 3** (commits `d863145`, `f9200b8`) regenerated `docs/design/TDD.md`
and `docs/design/technical/API_CONTRACTS.md` at 2026-08-26T04:41. The material change is a
**new hard requirement** derived from the prior QA review's HIGH finding:

- **TDD §D3 / Q2a — Aggregate overflow (finite-total invariant):** after adding each line total,
  if the running sum becomes non-finite (`Infinity`), reject the whole request with
  `400 { "error": "total is too large" }`. Check performed inside the accumulation loop
  (fail-fast, all-or-nothing). Added to: the Q-table (Q2a), the handler pseudocode (step f),
  the security section (D7), the test matrix (§D9 edge case #9), and the risk table (HIGH).
- **API_CONTRACTS.md:** documents the new `{ "error": "total is too large" }` error response and
  the accumulator re-validation behavior.

Per Document Precedence (TDD is authoritative — directive: *"Current architecture spec. Implement
to match"*), implementing Q2a is the primary task for this iteration. The stale special-instruction
items (non-GET verbs, oversized tokens, negative qty/unit) were already implemented in a prior
commit (`44a5a86`) and are re-verified below.

## Requirements checklist

| Req | Source | Action | Status |
|---|---|---|---|
| Q2a aggregate-overflow guard in `/price/bulk` | TDD §D3/Q2a, pseudocode step f | Implement guard in `src/app.js` | ✅ Done |
| Q2a error message exactly `total is too large`, status 400 | TDD §D3/Q2a, API_CONTRACTS | Match string + status | ✅ Done |
| Q2a guard inside loop, fail-fast, all-or-nothing | TDD pseudocode step f | Place after `total += priceWidget(...)` | ✅ Done |
| Q2a test (50× `1e307:1` → 400) | TDD §D9 edge case #9 | Add test | ✅ Done |
| SI-1 (HIGH): non-GET verbs → 404 on both routes | special_instructions | Verify present (already added `44a5a86`) | ✅ Present (`src/app.test.js:212-222`) |
| SI-2 (MED): oversized single token → 400 | special_instructions | Verify present | ✅ Present (`:159-169`, `:230-242`) |
| SI-3 (LOW): negative qty bulk / negative unit price | special_instructions | Verify present | ✅ Present (`:247-251`, `:256-260`) |
| Backward compat: `/health`, `/price`, `/price/bulk` unchanged contracts | TDD, API_CONTRACTS | No changes to existing branches | ✅ Preserved |
| Do NOT add coverage command to `package.json` test script | special_instructions + GATE-INTEGRITY | Leave `package.json` untouched | ✅ Untouched |

## Implementation tasks

1. **Core:** add the `if (!Number.isFinite(total))` guard inside the bulk accumulation loop
   (`src/app.js`), returning `400 { error: 'total is too large' }`. — DONE
2. **Test:** add the Q2a overflow test (`src/app.test.js`). — DONE
3. **Verify:** syntax-check both files (`node --check`) + targeted single-file run of the touched
   spec (`node --test src/app.test.js`). Full-suite run is deferred to qa-test-execution per the
   Test Execution Policy. — DONE (39/39 pass locally).

## Out of scope / gate integrity

- No quality-gate/threshold/config changes (GATE-INTEGRITY). No `package.json`, no coverage
  command, no eslint/tsconfig changes.
- No dependency changes → no lockfile reconciliation needed.
- `/price` and `/health` are untouched; `priceWidget` is untouched (its finite-guard behavior and
  the documented `/price` NaN→null passthrough are preserved).
