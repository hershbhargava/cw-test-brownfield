# Implementation Plan — Iteration 4 (Issue #1: Add bulk pricing endpoint)

## Context

The `GET /price/bulk` feature is **already implemented, shipped, and fully tested**
in `src/app.js` (lines 32–71) and `src/app.test.js` (39 runtime tests, 100% line /
100% statement / 100% function / 96.55% branch coverage). The primary TDD record
(`docs/design/TDD.md` §D1–D11) matches the code line-for-line.

This iteration consumes the **architecture review gap analysis**
(`arch-review/iteration-4/GAP_ANALYSIS.md`), which found **0 CRITICAL, 1 HIGH, 2
MEDIUM** gaps — **all of them documentation-propagation gaps** in sibling "detailed
view" technical docs that `TDD.md` §1 delegates to. There are **no functional,
code, or test gaps**. The arch-review explicitly states these fixes are "mechanical"
and "none require re-architecting anything."

## Document Summary (key points)

- **arch-review GAP_ANALYSIS (iter 4)**: 3 gaps, all stale/incomplete sibling docs.
  Code + TDD already correct.
- **TDD.md §D1–D11**: Authoritative, matches code. `/price/bulk` additive route +
  shared `priceWidget` finiteness guard (§D2a) + two-layer overflow guard (§D3/Q2a).
- **PRD / PRD_DELTA**: Feature shipped; FR-BULK-1..7 all delivered.
- **API_CONTRACTS.md**: Contract body for §3 accurate; only the status banner stale.
- **SYSTEM_ARCHITECTURE.md**: Describes only 2 endpoints; missing bulk box + flow.
- **SECURITY_DESIGN.md**: Threat table omits the new finiteness guard + 50-item cap.

## Gap Fixes (HIGHEST PRIORITY — from GAP_ANALYSIS.md)

| Gap | Pri | File | Fix |
|-----|-----|------|-----|
| GAP-DIFF-001 | HIGH | `docs/design/technical/SYSTEM_ARCHITECTURE.md` | §1 "two" → "three" endpoints; add `/price/bulk` box + call edge to §3 diagram; add §4 `GET /price/bulk` request-flow subsection; note `priceWidget` now has 2 callers; add finiteness guard to §5. |
| GAP-DIFF-002 | MEDIUM | `docs/design/technical/API_CONTRACTS.md` | §3 status banner "Designed (not yet implemented)" → "Implemented and shipped (issue #1, iteration 4)", cross-referencing `src/app.js:32-71` + tests. |
| GAP-DIFF-003 | MEDIUM | `docs/design/technical/SECURITY_DESIGN.md` | Threat-surface "Input validation" row → **Partial** (finiteness guard both endpoints + bulk per-token/cap/overflow guards); "Rate limiting / DoS" row → **Partial (request-shape bound)** noting `MAX_BULK_ITEMS = 50`; update Auth row (3 routes) + observations. |

## Scope boundaries

- **NO code changes** — `src/app.js` and `src/app.test.js` are already correct and
  must not be touched (arch-review confirms zero functional gaps).
- **NO gate/threshold changes** — none applicable; this is a docs-only iteration.
- Only the 3 flagged `docs/design/technical/*.md` files are edited (plus accuracy
  touch-ups to adjacent rows/sections in the same files for internal consistency).

## Tasks

- [x] GAP-DIFF-001 — SYSTEM_ARCHITECTURE.md (§1, §3 diagram, §4 flow, §5 guard)
- [x] GAP-DIFF-002 — API_CONTRACTS.md (§3 status banner)
- [x] GAP-DIFF-003 — SECURITY_DESIGN.md (threat table rows + observations)
- [x] Lightweight verification (parse check; no tsconfig → typecheck skipped; no suite run)
- [x] External-memory artifacts + commit
