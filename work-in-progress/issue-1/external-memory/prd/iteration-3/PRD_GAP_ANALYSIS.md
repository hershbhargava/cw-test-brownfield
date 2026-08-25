# PRD DIFF Gap Analysis — Iteration 3

**Document Reviewed**: `docs/requirements/PRD_DELTA_issue-1.md`
**Reviewer Role**: Senior Product Manager (automated review)
**Review Iteration**: 3
**Issue**: hershbhargava/cw-test-brownfield#1 — "Add bulk pricing endpoint"

This document lists every gap identified during review of the PRD DIFF, in priority order. Gap IDs are stable identifiers for tracking resolution across future iterations.

---

### Gap ID: GAP-DIFF-001
- **Priority**: HIGH
- **Section**: §6 Requirements (FR-BULK-4, FR-BULK-5) vs. §9 Open Questions & Decisions (Q1, Q2)
- **Description**: FR-BULK-4 ("Invalid or malformed line items are skipped and reported in an `errors` array") and FR-BULK-5 ("Response shape is `{ total, breakdown[], errors[] }`") are both phrased in §6 as if they were settled, using language like "confirmed in Q2" and "confirmed in Q1." However, §9's tracking table lists Q1 and Q2 with **Status = OPEN** and an **empty Answer column**. The requirements text and the decision log directly contradict each other.
- **Impact**: A reader who scans §6 alone (e.g., an engineer picking up the ticket) would reasonably believe the response envelope and error-handling behavior are finalized and start implementing against them. If Q1/Q2 are later resolved differently than what FR-BULK-4/5 currently state, this creates rework risk and possible API contract churn after code is written. This is an internal-consistency defect, not just a documentation nit — it undermines trust in which parts of the DIFF are actually decided.
- **Recommendation**: Either (a) reword FR-BULK-4/5 to explicitly state they are the *proposed* answer pending confirmation (e.g., "Proposed: ... — see Q2, currently OPEN"), or (b) if Q1/Q2 are in fact decided, update §9's Status/Answer columns to CLOSED with the agreed answer. Do not leave the two sections asserting different states.

---

### Gap ID: GAP-DIFF-002
- **Priority**: HIGH
- **Section**: §9 Open Questions & Decisions (Q1, Q2)
- **Description**: Two contract-defining questions remain genuinely unresolved:
  - **Q1**: What is the response envelope shape for the bulk endpoint (flat total vs. `{ total, breakdown[] }` vs. something else)?
  - **Q2**: How should invalid/malformed line items and NaN-producing inputs be handled — reject the whole request, skip-and-report, or something else — and does this align with or diverge from the existing `/price` endpoint's NaN behavior documented in `PRD.md` §7?

  Both are marked HIGH priority by the document's own author and both directly determine the wire contract of the new endpoint.
- **Impact**: These are not peripheral details — they define the API contract that consumers will integrate against. Proceeding to implementation without resolving them risks either (a) building the wrong contract and having to make a breaking change shortly after release, or (b) stalling implementation entirely. This gap blocks the DIFF from being fully "implementation-ready."
- **Recommendation**: Route Q1 and Q2 to the actual product/engineering decision-maker before implementation begins. Given the existing `/price` endpoint's precedent (NaN → `{ total: null }`, HTTP 200), consider proposing that precedent as the default answer for Q2 to keep the new endpoint consistent with existing behavior, and bring that proposal to stakeholders as a starting point rather than leaving the question fully open-ended.

---

### Gap ID: GAP-DIFF-003
- **Priority**: MEDIUM
- **Section**: §9 Open Questions & Decisions (Q3)
- **Description**: Q3 asks whether the number of line items in a single request should be bounded (relevant because §5's Performance Impact subsection separately flags unbounded `items` as a potential resource-exhaustion vector), but the question is posed without a concrete proposed default (e.g., "cap at 50 items?"). It is left as an open-ended question rather than a specific proposal for stakeholders to accept or reject.
- **Impact**: Open-ended questions without a proposed default tend to stall longer in review than yes/no or accept/reject questions, and the performance-impact concern raised in §5 (unbounded input) has no concrete mitigation attached to it in the current draft.
- **Recommendation**: Add a concrete proposed default to Q3, e.g., "Proposed: cap at 50 items per request, returning 400 if exceeded — accept or suggest alternative." This converts an open-ended design question into a fast approve/reject decision and directly closes the loop with the performance concern already flagged in §5.

---

### Gap ID: GAP-DIFF-004
- **Priority**: MEDIUM
- **Section**: §8 Testing Strategy
- **Description**: Three of the eight listed test scenarios (specifically the ones covering malformed line items, empty `items` parameter, and over-limit item counts) are named but do not have concrete expected values (expected status code, expected response body shape) attached, because those outcomes depend on the still-unresolved Q2, Q3, and Q4.
- **Impact**: A test scenario without a concrete expected outcome is not yet actionable for an engineer writing tests — it's a placeholder rather than an acceptance criterion. This is a direct downstream consequence of GAP-DIFF-002 and GAP-DIFF-003 and will resolve automatically once those questions are answered, but it currently leaves ~37% of the listed test scenarios non-actionable.
- **Recommendation**: Once Q2/Q3/Q4 are resolved, backfill concrete expected status codes and response bodies for the affected test scenarios before this DIFF is treated as implementation-ready. No independent action needed beyond resolving the upstream open questions.

---

### Gap ID: GAP-DIFF-005
- **Priority**: LOW
- **Section**: §6 Requirements (FR-BULK-4) / §9 Q2
- **Description**: The DIFF does not specify whether error messages for invalid line items should identify *which* line item(s) failed (e.g., by index or by the raw substring) when multiple lines in a single request are invalid, versus a single generic error message for the whole request.
- **Impact**: Minor — affects debuggability/usability for API consumers troubleshooting a rejected bulk request, but does not block the core contract decision in Q2.
- **Recommendation**: Fold this into the Q2 resolution: when proposing the invalid-line handling policy, also specify whether per-line error identification (e.g., `{ index: 2, raw: "abc:10", error: "..." }`) is included in the `errors` array.

---

### Gap ID: GAP-DIFF-006
- **Priority**: LOW
- **Section**: §5 Impact Analysis (Performance Impact) / §9 Q3
- **Description**: The performance-impact discussion around unbounded `items` input (potential DoS via extremely long query strings) does not mention that HTTP/URL length is already naturally bounded by common server and proxy defaults (e.g., most servers reject URLs beyond ~8KB), which provides useful context for how severe the risk actually is before an explicit item-count cap is enforced.
- **Impact**: Very minor — this is a missing piece of context rather than a functional gap. It could lead reviewers to over- or under-estimate the urgency of Q3's item-limit decision.
- **Recommendation**: Optionally add a one-line note to §5 acknowledging the natural URL-length backstop, to give stakeholders calibrated context when deciding on Q3's explicit item cap.

---

## Gap Summary

| Priority | Count | Gap IDs |
|----------|-------|---------|
| CRITICAL | 0 | — |
| HIGH | 2 | GAP-DIFF-001, GAP-DIFF-002 |
| MEDIUM | 2 | GAP-DIFF-003, GAP-DIFF-004 |
| LOW | 2 | GAP-DIFF-005, GAP-DIFF-006 |
| **Total** | **6** | |

No CRITICAL gaps were identified. The two HIGH gaps are related: one is an internal-consistency defect (GAP-DIFF-001) and the other is the underlying unresolved-decision root cause (GAP-DIFF-002). Resolving Q1 and Q2 with the actual stakeholder and then reconciling §6's wording against §9's decision log would close both HIGH items in a single pass.
