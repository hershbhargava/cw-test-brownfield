# Edge Case Review — Iteration 3

**Scope:** `src/app.js` (67 lines) — `priceWidget`, `GET /health`, `GET /price`, `GET /price/bulk`.

## Edge Cases Tested (confirmed present in `src/app.test.js`)

| Edge case | Line(s) | Test |
|---|---|---|
| qty exactly 0 (boundary) | app.js:15 | L12-14 (`priceWidget` unit), L66-70 (bulk) |
| qty exactly 99 vs 100 (discount boundary) | app.js:16 | L9-11, L193-197 |
| Float rounding (`0.1+0.2`) | app.js:17 | L58-63 |
| `Infinity` via `1e400` literal, single token | app.js:11, 54 | L159-169 |
| `Infinity` via 400-digit numeral string, single token | app.js:54 | L230-242 |
| `NaN` via non-numeric token in bulk | app.js:54 | L72-76 |
| `NaN` via non-numeric qty in `/price` (documented passthrough, NOT rejected) | app.js:11 (NaN excluded from guard) | L180-184 |
| Missing `:` delimiter | app.js:47 | L78-82 |
| Extra `:` delimiter | app.js:47 | L84-88 |
| Missing `items` param entirely | app.js:37 | L90-94 |
| Empty-string `items` param | app.js:37 | L96-100 |
| Item count = 51 (over cap) | app.js:41 | L102-107 |
| Item count = 50 (exact cap boundary) | app.js:41 | L109-114 |
| Adjacent delimiters → empty token (`,,`) | app.js:47 (empty string splits to `['']`, length 1 ≠ 2) | L117-121 |
| Trailing delimiter → empty token | app.js:47 | L123-127 |
| Repeated query param → array, not string | app.js:37 (`typeof raw !== 'string'`) | L131-135 |
| Negative qty (distinct from zero) | app.js:15 | L247-251 |
| Negative unit price (both endpoints, documented/unvalidated) | (no guard on unit sign) | L201-205, L256-260 |
| Non-GET HTTP verbs (POST/PUT/DELETE × 2 routes) | Express route registration (GET-only) | L212-222 |
| Unknown route | Express default | L187-190 |

This is a genuinely thorough edge-case inventory for the boundaries that TDD §D3/Q1-Q6 and PRD_DELTA §6/§9 call out explicitly. Every documented open question (Q1-Q6) has at least one corresponding test.

## Edge Case NOT Tested (HIGH — the central finding of this review)

**Aggregate numeric overflow of the running sum across multiple individually-valid line items.**

This is a distinct edge-case *class* from "single oversized token" (which IS tested, L230-242) and from "single `Infinity`-literal token" (which IS tested, L159-169). The untested case is: **N tokens, each individually well within finite range and each individually passing the `Number.isFinite` guard at `app.js:54`, whose cumulative sum at `app.js:57` exceeds `Number.MAX_VALUE` (≈1.7976931348623157e308) and becomes `Infinity`.**

Boundary math:
- `Number.MAX_VALUE ≈ 1.7976931348623157e308`
- `MAX_BULK_ITEMS = 50` (`app.js:31`)
- Any per-line value ≥ `Number.MAX_VALUE / 50 ≈ 3.595e306` will, if repeated 50×, overflow the sum.
- Concretely reproduced this session: `items=1e307:1` × 50 → `priceWidget(1e307, 1)` = `9e306` per line (10% discount applies since `1e307 ≥ 100`) → sum = `4.5e308` → `Infinity` → `JSON.stringify({total: Infinity})` → `{"total":null}`, **HTTP 200**.

This also means the bug is **not limited to exotic edge inputs** — any legitimate-looking large bulk order (e.g., high-value B2B inventory pricing with large unit counts/prices, which is plausible for a "widget-service" doing bulk pricing) could trigger it long before 50 items if unit prices are large enough, since the cap is on *item count*, not on *value magnitude* or *running total*.

## Severity Justification: HIGH

1. **Silent data corruption, not a loud failure.** The response is `HTTP 200`, not `400`. A calling service or UI that doesn't specifically guard against `total: null` will propagate a null/zero-like price into downstream billing, invoicing, or display logic.
2. **Directly contradicts the code's own stated intent.** The comment at `app.js:51-53` says the per-token finite guard exists so "the bulk sum can never be a nonsensical null/Infinity" — this is currently a false statement about the code's own behavior.
3. **Reachable via the endpoint's own documented maximum capacity** (`MAX_BULK_ITEMS = 50`), not an unbounded/unreasonable input — an attacker or buggy client doesn't need to bypass any validation to trigger it, only to use the feature at its stated maximum scale with large-but-individually-valid numbers.
4. **Two review cycles open.** First identified with a working fix and test template in this iteration's prior `ITERATION-4-GUIDANCE.md` pass; still unaddressed as of this pass (confirmed via git log — no implementation commit since the finding was raised).

## Edge Cases Considered and Deliberately Out of Scope (not gaps)

- **Negative unit price** — explicitly documented as accepted/unvalidated behavior in TDD §9.2 and locked in by regression tests (L201, L256); not a new requirement per PRD_DELTA, correctly left alone.
- **NaN on `/price`** — explicitly must NOT be rejected per API_CONTRACTS "Error semantics" (legacy passthrough contract); correctly excluded from the finite guard (`app.js:11`, `!Number.isNaN(v)` condition) and locked in by test L180.
- **Bulk endpoint's `Infinity` from NaN** — N/A; `NaN` fails `Number.isFinite` too, so it's already caught by the same L54 guard as `Infinity` for bulk (bulk is intentionally stricter than `/price`, per TDD §D3/Q2, correctly implemented and tested).
