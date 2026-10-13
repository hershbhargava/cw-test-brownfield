# PRD DIFF Gap Analysis — `PRD_DELTA_issue-1.md` (Review Iteration 4)

> Reviewed document: `docs/requirements/PRD_DELTA_issue-1.md` (PRD iteration 5)
> Cross-checked against: `docs/requirements/PRD.md` (iteration 4), `docs/requirements/PRD_issue-1-QandA.md`,
> `src/app.js`, `src/app.test.js`, `README.md`, git history (`git log --oneline --all -- src/app.js`)

---

## Summary

The DELTA is exceptionally well-grounded: every behavioral claim and every resolved
open-question citation to `src/app.js` was independently verified against the actual
source lines and found **accurate** (see Traceability Verification Table below). The
feature is shipped, tested (39/39 passing, 100% line coverage), and the document
correctly reflects that status. One **HIGH**-priority defect was found: a factual
inconsistency between the DELTA's Functional Requirement numbering and the numbering
already committed in the existing product PRD (`PRD.md`). Three lower-priority
clarity/precision gaps round out the findings.

**Total gaps found**: 4 (1 HIGH, 1 MEDIUM, 2 LOW)

---

## Traceability Verification Table (spot-checks performed)

| DELTA claim | Cited source | Verified against actual code | Result |
|---|---|---|---|
| §9 Q1/Q6 — "round once at end" → `src/app.js:67` | `src/app.js:67` | Line 67: `res.json({ total: +total.toFixed(2) });` | ✅ Accurate |
| §9 Q2 — malformed-token / finiteness rejection → `src/app.js:47,54` | `src/app.js:47,54` | Line 47: `if (parts.length !== 2)`; line 54: `if (!Number.isFinite(qty) \|\| !Number.isFinite(unit))` | ✅ Accurate |
| §9 Q2a — running-sum overflow guard → `src/app.js:63` | `src/app.js:63` | Line 63: `if (!Number.isFinite(total))` | ✅ Accurate |
| §9 Q3 — 50-item cap → `src/app.js:31,41` | `src/app.js:31,41` | Line 31: `const MAX_BULK_ITEMS = 50;`; line 41: `if (tokens.length > MAX_BULK_ITEMS)` | ✅ Accurate |
| §9 Q4 — items-required guard → `src/app.js:37` | `src/app.js:37` | Line 37: `if (typeof raw !== 'string' \|\| raw === '')` | ✅ Accurate |
| §4.1 AC "`1:0.1,1:0.2` → `0.3`" | — | `src/app.test.js:58-63` "bulk: final rounding to 2 decimals" | ✅ Test exists, matches |
| §4.1 AC "50×`1e307:1` → `total is too large`" | — | `src/app.test.js:272-277` | ✅ Test exists, matches |
| §4.1 AC "`items=99:2` → 198, no discount" | — | `src/app.test.js:192-197` | ✅ Test exists, matches |
| §10.2 "PRD.md §7 ... gains FR-BULK-1..9" | `PRD.md` §7 | `PRD.md` §7 defines **FR-BULK-1 through FR-BULK-7 only**, with different descriptions per number | ❌ **Inaccurate — see GAP-DIFF-001** |

---

### GAP-DIFF-001 — FR-BULK numbering contradicts the existing product PRD

**Priority**: HIGH
**Section**: §6 (Requirements) and §10.2 (Appendix — Existing PRD sections affected)
**Dimension(s) affected**: Consistency, Traceability

**Description**: The DELTA defines a 9-item FR-BULK list (`FR-BULK-1` "Bulk endpoint"
… `FR-BULK-9` "Tests") with its own ordering, then states in §10.2: *"`PRD.md` §7
(Functional Requirements) — gains FR-BULK-1..9."* This is factually wrong on two
counts:

1. `PRD.md` §7 **already exists** (iteration 4, committed) with a **7-item** FR-BULK
   list (`FR-BULK-1` "Presence" … `FR-BULK-7` "All-or-nothing aggregate") — it does
   not "gain" anything from this iteration; the capability was already documented.
2. The IDs **do not line up with the same requirement** across the two documents.
   For example:
   - `PRD.md` `FR-BULK-1` = "Presence" (items required) vs. DELTA `FR-BULK-1` =
     "Bulk endpoint" (a general umbrella statement). The DELTA's "Required `items`"
     requirement is instead `FR-BULK-6`.
   - `PRD.md` `FR-BULK-2` = "Item cap" vs. DELTA `FR-BULK-2` = "Per-line pricing via
     existing rule". The DELTA's "Item cap" is `FR-BULK-5`.
   - `PRD.md` `FR-BULK-6` = "Running-sum overflow guard" vs. DELTA `FR-BULK-7` =
     "Aggregate-overflow guard" (same requirement, different number).
   - `PRD.md` `FR-BULK-7` = "All-or-nothing aggregate" vs. DELTA `FR-BULK-8` =
     "All-or-nothing response" (same requirement, different number).
   - Two DELTA entries (`FR-BULK-1` umbrella, `FR-BULK-9` Tests) have **no
     corresponding ID** in `PRD.md` at all.

**Impact**: `PRD.md` is the authoritative, already-committed living document; its
FR-BULK IDs may already be referenced elsewhere (e.g. `PRD.md` §11 Risks table cites
"`FR-BULK-6, Q2a`" for the overflow guard). If an architect, developer, or QA reviewer
reads the DELTA and says "see FR-BULK-6," they mean a *different requirement*
("Required `items`") than someone reading `PRD.md` who says "see FR-BULK-6" ("Running-
sum overflow guard"). This is exactly the kind of silent cross-document ID collision
that causes miscommunication in downstream workflows (architecture reviews, test-case
mapping, QA sign-off), even though the underlying feature behavior described is
correct in both documents.

**Recommendation**:
- Re-sequence the DELTA's `FR-BULK-*` IDs to **reuse `PRD.md`'s existing FR-BULK-1..7
  numbering verbatim** for the seven requirements that already have a `PRD.md`
  counterpart (Presence→1, Cap→2, Token shape→3, Finiteness→4, Per-line pricing→5,
  Overflow guard→6, All-or-nothing→7).
- For the two DELTA-only items (the umbrella "Bulk endpoint" statement and the
  dedicated "Tests" requirement), either fold them into prose (they don't need their
  own FR-ID) or extend the range explicitly as `FR-BULK-8`/`FR-BULK-9` **and** add a
  short note to `PRD.md` §7 in the next PRD refresh so `PRD.md` adopts the same two
  additions — do not describe them as already "gained" by `PRD.md` until that happens.
- Correct the §10.2 sentence to: *"`PRD.md` §7 already documents FR-BULK-1..7 for this
  capability (iteration 3/4); this DELTA adds FR-BULK-8 (umbrella) and FR-BULK-9
  (tests), which should be folded into `PRD.md` on its next refresh."*

---

### GAP-DIFF-002 — "Modified non-functional requirements" header mislabels additive NFR notes

**Priority**: MEDIUM
**Section**: §6 (Requirements → "Modified non-functional requirements")
**Dimension(s) affected**: Clarity, Consistency

**Description**: §1 (Change Summary) explicitly states *"Modified features: 0 …
existing `/price` and `/health` behaviour is untouched."* Yet §6 has a subsection
titled **"Modified non-functional requirements"** covering Performance and Security
for the *new* endpoint — nothing about these NFRs was actually modified; they are new
considerations that apply only to the new `/price/bulk` route. The subsection text
itself says *"Other NFRs in `PRD.md` §8 are unchanged,"* which confirms no
modification occurred, making the header self-contradictory.

**Impact**: Low risk of misreading, but it weakens the DELTA's own "0 modified
features" claim and could cause a reviewer to search for a changed NFR in `PRD.md` §8
that doesn't exist.

**Recommendation**: Rename the subsection to **"New / extended non-functional
considerations"** (matching the "Extended" change category defined in this workflow's
own Phase 2 taxonomy) to remove the self-contradiction.

---

### GAP-DIFF-003 — Rollback plan understates the change as a single commit

**Priority**: LOW
**Section**: §7 (Migration & Rollback)
**Dimension(s) affected**: Feasibility, Clarity

**Description**: §7 states: *"Rollback plan: revert the commit that adds the
`/price/bulk` route and its tests."* Git history shows the feature was built and
hardened across **four** commits, not one:
```
fcd74b2 feat(price): add GET /price/bulk endpoint (issue #1)
2257de0 fix(price): reject non-finite input on /price and /price/bulk (issue #1 iter4)
34836a7 feat(issue-1): add Q2a aggregate-overflow guard to /price/bulk (TDD §D3)
e6e6a8d Add GET /price/bulk endpoint (issue #1) (#4)
```
A single-commit revert would not fully remove the feature (it would leave the
finiteness fix and the Q2a overflow guard behind, partially modifying `priceWidget`'s
shared behavior in ways that also affect `/price`).

**Impact**: If rollback were ever actually invoked by someone following this plan
literally, it could under-revert and leave `/price`'s finiteness guard (which also
touches the single-line endpoint) in an inconsistent state.

**Recommendation**: Reword to *"revert the commit range that introduced and hardened
`/price/bulk` (`fcd74b2`..`e6e6a8d`), noting that the finiteness guard commit
(`2257de0`) also touches the shared `priceWidget` function used by `/price` — confirm
that reverting it does not regress the intentionally-added `/price` Infinity
rejection (FR-4) before rolling back."*

---

### GAP-DIFF-004 — Error-message string stability not addressed as part of the backward-compatibility contract

**Priority**: LOW
**Section**: §6 (Backward compatibility requirements) / §10.3 (API surface)
**Dimension(s) affected**: Completeness, Testability

**Description**: The backward-compatibility requirement only commits to "byte-for-byte
compatible" status codes/envelopes for `/price` and `/health`. It does not state
whether the **exact error strings** introduced for `/price/bulk` (`"items is
required"`, `"too many items (max 50)"`, `"invalid item '<token>'"`,
`"total is too large"`) are part of the supported contract or free to change. Tests in
`src/app.test.js` assert on these exact strings (`assert.deepStrictEqual(body, {
error: ... })`), which implicitly treats them as contractual today — but the DELTA
never says so explicitly for callers outside the test suite.

**Impact**: A future maintainer could casually reword an error string (e.g., for
clarity) without realizing external callers might string-match on it, since the DELTA
never flagged these strings as a compatibility surface.

**Recommendation**: Add one sentence to "Backward compatibility requirements":
*"The specific `error` message text enumerated in §10.3 is treated as part of the
`/price/bulk` contract (it is asserted verbatim by `src/app.test.js`); changing wording
requires a deliberate, tested decision, not an incidental edit."*

---

## Gaps Explicitly NOT Found (checked and clear)

- ✅ Data impact — correctly and explicitly stated as "None" with justification (stateless, no DB).
- ✅ Integration impact — correctly and explicitly stated as "None" with justification.
- ✅ Scope boundaries — explicit and accurate (§4.3), including the subtle `NaN`-passthrough divergence between `/price` and `/price/bulk`.
- ✅ Regression coverage claim — the "39 runtime tests, 100% line coverage" figure matches `PRD.md` §3 and the iteration-4 PRD metadata's `test_signal` block exactly.
- ✅ User-story cross-reference to `PRD.md` (§10.2, US-BULK-1/2 ↔ US-4/US-5) — accurate, unlike the FR cross-reference (GAP-DIFF-001).
