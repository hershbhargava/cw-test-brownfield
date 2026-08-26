# Developer Implementation Plan — Issue #1 (Iteration 3)

## Session context
- Iteration: 3 (CONTINUATION — feature already built in iteration 1/2 and committed)
- Branch: `feature/issue-1`
- Mode: New Feature (Additive) — `GET /price/bulk`

## Document changes since last iteration
`git diff --stat HEAD~1 -- docs/` → **no changes**. API_CONTRACTS.md and TDD.md
regeneration timestamps (2026-08-25T20:42) predate the last code commit; their
content matches the committed implementation. No re-planning required.

## Documents reviewed (this iteration)
- `docs/design/technical/API_CONTRACTS.md` — §3 fixes the `/price/bulk` contract
  (query `items`, `{ total }` envelope, four `400` error strings, deliberate NaN
  divergence from `/price`).
- `docs/design/TDD.md` — Architecture Delta §D1–D11 (authoritative technical spec):
  §D3 resolves Q1–Q6; §D4 gives the handler pseudocode; §D9 the test plan.
- `docs/requirements/PRD.md` / `PRD_DELTA_issue-1.md` — product intent (defers to TDD).
- `docs/design/technical/SECURITY_DESIGN.md` — posture unchanged; 50-item cap is the
  only new-surface mitigation (§D7).

## Requirements checklist (TDD §D4 / §D9, API_CONTRACTS §3)
- [x] `GET /price/bulk?items=qty:unit,…` route added additively — `src/app.js:22`
- [x] Missing/empty `items` → `400 { error: "items is required" }` — `src/app.js:27-29`
- [x] Non-string `items` (repeated param → array) treated as missing — `src/app.js:27`
- [x] `> 50` tokens → `400 { error: "too many items (max 50)" }` — `src/app.js:31-33`
- [x] Token not exactly one `:` → `400 { error: "invalid item '<token>'" }` — `src/app.js:36-39`
- [x] `Number.isNaN(qty|unit)` → `400 invalid item` (Q2 divergence) — `src/app.js:40-43`
- [x] `priceWidget` reused per line; `qty<=0` throws → `400 qty must be positive` — `src/app.js:44,47-49`
- [x] Sum line totals, final round `+(sum).toFixed(2)`, `200 { total }` — `src/app.js:46`
- [x] `priceWidget`, `/price`, `/health` unchanged (backward compatible) — `src/app.js:4-16`
- [x] Tests extend `src/app.test.js` in `node:test` style (§D9) — 21 tests present

## Gap analysis
No `GAP_ANALYSIS.md` supplied to this iteration. Full requirement→code trace above
shows **zero implementation gaps**. Per the Golden Rule (simple requirements deserve
simple implementations; do not add complexity beyond spec), no code change is made.

## Tasks
1. [x] Read/confirm upstream docs (unchanged since HEAD~1).
2. [x] Trace every §D4/§D9 requirement to committed code.
3. [x] Lightweight verify: `node --test src/app.test.js` → 21/21 pass.
4. [x] Write external-memory artifacts + commit.
