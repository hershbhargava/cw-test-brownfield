# PRD Reconstruction — Clarifying Questions & Assumptions (issue #1)

> This file records every ambiguity encountered while reverse-engineering the PRD
> for `widget-service`, and the assumption used to proceed. Downstream workflows
> (architect, dev, QA) use this to distinguish PRD claims that rest on assumptions
> from those grounded directly in code.
>
> **Sources**: GitHub issue #1, `src/app.js`, `src/app.test.js`, `package.json`,
> `README.md`, and the reconstructed TDDs under `docs/design/**`.

---

## Q1 — Does the requested `GET /price/bulk` endpoint exist?

- **Question**: Issue #1 asks to "Add `GET /price/bulk?items=qty:unit,qty:unit`…".
  Is this an existing capability to document, or a planned/aspirational feature?
- **Assumption**: It does **not** exist. There is no `/price/bulk` route anywhere in
  `src/app.js`; only `/health` and `/price` are registered. Per reverse-engineering
  rules, the PRD documents what the code IS, so bulk pricing is recorded as **Out of
  Scope** (PRD §6) and flagged as a gap (§13), not as a shipped feature.
- **Impact if wrong**: If the code actually contained a bulk route (it does not),
  PRD §5–§7 would need a new capability, story, and functional requirements.
- **Source**: `hershbhargava/cw-test-brownfield/issues/issue-1.json` (issue body);
  `src/app.js` (route registrations).

## Q2 — Is the `NaN → { "total": null }` response intended behavior?

- **Question**: Malformed/missing `qty`/`unit` produce `200 { "total": null }`
  instead of a `400`. Is this by design or a bug?
- **Assumption**: **Unintended** robustness gap, consistent with how the TDDs frame
  it ("reflects current behavior, not intended design"). Documented as a risk (§11),
  not a designed feature.
- **Impact if wrong**: If intentional, it would become an explicit functional
  requirement rather than a risk, changing §7 and §11.
- **Source**: `docs/design/technical/API_CONTRACTS.md` → Error semantics;
  `docs/design/TDD.md` §9; `src/app.js` → `priceWidget`.

## Q3 — Should the `unit` (unit price) parameter be validated?

- **Question**: `priceWidget` validates only `qty`; `unit` can be zero or negative.
  Is that acceptable?
- **Assumption**: Acceptable for a trusted internal caller; no validation is added or
  required by the code.
- **Impact if wrong**: A new functional requirement and mitigation would be added to
  §7/§11.
- **Source**: `src/app.js` → `priceWidget`; `docs/design/technical/SECURITY_DESIGN.md`.

## Q4 — Who are the real users/consumers of the service?

- **Question**: There is no auth or identity model, so who calls `/price`?
- **Assumption**: Internal systems/services (inferred from README "internal" framing
  and the machine-oriented JSON API). Personas in §4 are inferred, not code-derived.
- **Impact if wrong**: The Target Users & Personas section (§4) would need revision.
- **Source**: `README.md`; `docs/design/technical/SECURITY_DESIGN.md` (no auth).

## Q5 — Is environment-based port configuration required?

- **Question**: Port `3000` is hardcoded with no `process.env` usage. Is
  configurability a requirement?
- **Assumption**: Not required by the current product; documented as a constraint and
  a deployment-flexibility risk.
- **Impact if wrong**: Adds a configurability non-functional requirement (§8/§10).
- **Source**: `src/app.js` → `app.listen(3000)`;
  `docs/design/technical/DEPLOYMENT_STRATEGY.md` → Environment/Config.

## Q6 — What discount tiers exist beyond the single 100-unit threshold?

- **Question**: Only one discount tier (10% at `qty >= 100`) is implemented. Are
  there other intended tiers?
- **Assumption**: No — the single threshold is the entire rule, as coded and tested.
- **Impact if wrong**: The pricing formula (FR-1/FR-2) and stories would expand.
- **Source**: `src/app.js` → `priceWidget`; `src/app.test.js`.
