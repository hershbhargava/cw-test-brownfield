# Architecture Quality Assessment — TDD_DELTA (Issue #1), Iteration 4

**Subject**: Architecture Delta §D1–D11 in `docs/design/TDD.md` (Add Bulk Pricing Endpoint)

Each dimension is scored 0–100 with evidence. Dimension weights reflect the
relative risk each poses for this specific change (a stateless, additive,
single-route delta with no data/infra/auth impact).

---

## 1. Requirements Coverage — 95/100 (weight 20%)

Every requirement in `PRD_DELTA_issue-1.md` §6 has a corresponding design element
in `TDD.md`:

| PRD_DELTA requirement | TDD_DELTA coverage |
|---|---|
| FR-BULK-1 Bulk endpoint | D4 (handler pseudocode), D6 (contract) |
| FR-BULK-2 Per-line pricing via `priceWidget` | D2 (reuse table), D4 step e |
| FR-BULK-3 Input parsing | D4 steps a–d, D3/Q5 |
| FR-BULK-4 Finiteness (stricter than `/price`) | D3/Q2, D4 step d, D2a |
| FR-BULK-5 Item cap (50) | D3/Q3, D4 step 4 |
| FR-BULK-6 Required `items` | D3/Q4, D4 step 2 |
| FR-BULK-7 Aggregate-overflow guard | D3/Q2a, D4 step f |
| FR-BULK-8 All-or-nothing | D1, D3/Q2 |
| FR-BULK-9 Tests | D9 (11 named new-behavior cases + regression list) |

All six PRD_DELTA open questions (Q1–Q6) are explicitly resolved in D3 with stated
rationale, and the resolutions were spot-checked against `src/app.js` (lines cited
in the gap analysis) — all accurate. The one deduction is that D3's rationale
column occasionally reasons about implementation detail (e.g., exact error
strings) that arguably belongs to the build phase rather than architecture, but
this is a minor style note, not a coverage gap.

## 2. Change Completeness — 65/100 (weight 20%)

The **code-level** ripple is fully and correctly identified: D2's table walks
every baseline element (`priceWidget`, route registration, error-handling idiom,
response envelope, statelessness) and states precisely how each is affected. The
implementation matches this table exactly.

The **documentation-level** ripple is incompletely executed. `TDD.md` §1 commits
to a model where `SYSTEM_ARCHITECTURE.md`, `API_CONTRACTS.md`, `SECURITY_DESIGN.md`,
and `DEPLOYMENT_STRATEGY.md` are the authoritative "detailed views." Of these,
only `API_CONTRACTS.md`'s *contract body* and `DEPLOYMENT_STRATEGY.md` (correctly
left unchanged) are in sync. `SYSTEM_ARCHITECTURE.md` was not updated at all for
the third endpoint (GAP-DIFF-001), and `SECURITY_DESIGN.md`'s threat-surface table
was not updated for the two new input-validation controls this delta introduces
(GAP-DIFF-003). This is scored as a real completeness gap because the delta
explicitly delegates these concerns to those documents, and a reader of those
documents alone would reach wrong conclusions.

## 3. Backward Compatibility — 92/100 (weight 15%)

Exemplary treatment of the one non-trivial compatibility nuance in this change:
the shared `priceWidget` finiteness guard (D2a) tightens `/price`'s behavior for
`±Infinity` input from `200 { total: null }` to `400`. This is:
- Explicitly called out as a deliberate, narrow exception to "purely additive" (D1, D6).
- Justified as a strict improvement (previously-nonsensical `null` → explicit error).
- Scoped precisely (`!Number.isNaN(v) && !Number.isFinite(v)` — `NaN` untouched) with the scope boundary spelled out (D2a) and verified against the actual guard in `src/app.js:10-14`.
- Covered by an explicit regression test asserting the `NaN` passthrough is *not* broken (`src/app.test.js:180-184`, cited in D9/D10).

Minor deduction: D1 states "Backward compatibility: **Preserved**" in bold before
immediately qualifying it with the `Infinity` exception two sentences later — the
header claim is slightly stronger than the detailed claim that follows it, which
could read as overselling at a skim. Substance is correct.

## 4. Data Migration — 100/100 (weight 5%)

Correctly and explicitly N/A (D5): stateless service, no schema, no persistence.
Consistent with the unchanged `TDD.md` §7 ("Not Applicable — verified absent")
and `PRD_DELTA` §5.2/§7. Nothing further required.

## 5. API Contract Changes — 80/100 (weight 15%)

The contract itself (D6, and the body of `API_CONTRACTS.md` §3) is complete,
correct, and matches `src/app.js` byte-for-byte, including the subtle
existing-endpoint note (the `/price` `Infinity` tightening) and six worked
examples. Versioning reasoning (no version bump needed, purely additive +
one strict tightening) is sound and consistent with `PRD_DELTA` §5.3.

Deducted for GAP-DIFF-002: the `API_CONTRACTS.md` §3 status banner was never
flipped from "Designed (not yet implemented)" to reflect shipped status,
directly contradicting the TDD's own "Implementation-complete" claim (D11) and
the PRD_DELTA's "SHIPPED" framing. A contract document with a self-contradictory
status line cannot be scored higher regardless of how accurate its body is.

## 6. Security Impact — 78/100 (weight 15%)

The TDD-level security analysis (D7) is appropriately scoped and reasoned: it
correctly identifies the only new attack surface (unbounded `items`), ties it to
a concrete mitigation (50-item cap) with a stated residual (bounded O(N) pure
arithmetic beyond the cap), and correctly notes no new injection sink (values
flow only into `Number()` and arithmetic, never `eval` or property access).

Deducted for GAP-DIFF-003: this analysis was not reflected back into
`SECURITY_DESIGN.md`, the living document that exists specifically to record the
threat surface. The delta introduces two genuinely new controls (the finiteness
guard and the item cap) and the document that should list them as mitigations
still describes input validation as "Minimal — Only `qty > 0`," which is now
stale.

## 7. Consistency with Base — 90/100 (weight 10%)

The new route follows every existing idiom: same local `try/catch → 400 {error}`
pattern (no central error middleware introduced), same `{ total }` response
envelope, same "pure function reused, no new layering" philosophy explicitly
reaffirmed in D4's "Layering note." The one rule deviation — rejecting `NaN`
on `/price/bulk` while `/price` passes it through — is not an inconsistency but a
deliberately reasoned, well-justified divergence (D3/Q2), clearly labeled as such
in both the TDD and `API_CONTRACTS.md`. Minor deduction only because the
divergence, while justified, does mean the two sibling endpoints now have subtly
different error semantics for the same invalid-input class, which is worth a
caller-facing callout beyond what currently exists (present in `API_CONTRACTS.md`
and `TDD.md`, but not surfaced in `README.md`, which only says "max 50 items" and
"malformed line rejects the whole request" without mentioning the `NaN`
divergence specifically — a LOW-severity documentation nit, not logged as a
separate gap since it doesn't affect architecture correctness).

---

## Weighted Overall Score

| Dimension | Score | Weight | Contribution |
|---|---|---|---|
| Requirements Coverage | 95 | 20% | 19.0 |
| Change Completeness | 65 | 20% | 13.0 |
| Backward Compatibility | 92 | 15% | 13.8 |
| Data Migration | 100 | 5% | 5.0 |
| API Contract Changes | 80 | 15% | 12.0 |
| Security Impact | 78 | 15% | 11.7 |
| Consistency with Base | 90 | 10% | 9.0 |
| **Total** | | **100%** | **83.5 ≈ 84** |

**Rating band**: 70–89 = **Good** — minor gaps, can proceed with notes.

The underlying architecture and implementation are sound and well-tested (39/39
tests, 100% line coverage). The score is held out of the "Excellent" band
entirely by documentation-propagation gaps (GAP-DIFF-001/002/003) in the sibling
technical documents, not by any defect in the design or code itself.
