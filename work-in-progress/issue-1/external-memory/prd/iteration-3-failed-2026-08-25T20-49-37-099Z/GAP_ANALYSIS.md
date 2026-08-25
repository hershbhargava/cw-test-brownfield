# Gap Analysis — TDD_DELTA Review, Issue #1 (Add Bulk Pricing Endpoint)

**Review Iteration**: 3 · **Mode**: TDD_DELTA (Living Documents) · **Reviewer**: Architecture Review Agent
**Subject**: `docs/design/TDD.md` §D1–D11 (Architecture Delta — Issue #1)
**Reference**: `docs/requirements/PRD_DELTA_issue-1.md`, base `docs/design/TDD.md` §1–§10, base `docs/requirements/PRD.md`

## Note on Incremental Mode / Prior Review Ledger

This task was labeled "Review Iteration 3 / Is First Review: false," but no prior **TDD_DELTA architecture review** artifacts exist. The only prior artifact under
`work-in-progress/issue-1/external-memory/prd/iteration-2/` is a **PRD generation/refresh
run** (`metadata.json` shows `"role": "prd-generator-ai"`, producing
`docs/requirements/PRD_DELTA_issue-1.md`) — not a TDD_DELTA architecture review. No
`GAP_ANALYSIS.md`, `ARCHITECTURE_QUALITY.md`, or `SECURITY_REVIEW.md` exist for any
prior iteration of this workflow.

**Consequence**: This is treated as the **first substantive TDD_DELTA architecture
review**. All findings below are reported as `[NEW]`. There is no prior gap ledger to
carry forward, so no items are marked FIXED/PARTIALLY FIXED/NOT FIXED relative to a
previous *architecture* review. (The six PRD-level open questions from
`PRD_DELTA_issue-1.md` §9 — Q1–Q6 — **have** all been resolved in this TDD_DELTA at
§D3; that resolution is credited as a strength, not a "fixed gap," since PRD open
questions are not architecture gaps.)

---

## Summary of Findings

| ID | Category | Priority | Status |
|----|----------|----------|--------|
| GAP-DIFF-001 | Change Coverage / Testing Feasibility | MEDIUM | [NEW] |
| GAP-DIFF-002 | API Contract / Input Robustness | MEDIUM | [NEW] |
| GAP-DIFF-003 | Change Coverage / Documentation | LOW | [NEW] |
| GAP-DIFF-004 | API Contract / Test Coverage | LOW | [NEW] |
| GAP-DIFF-005 | Security / Threat Model Completeness | LOW | [NEW] |

No CRITICAL or HIGH gaps were found. Backward compatibility, data migration, and
rollback design are all correctly scoped as N/A/trivial and are well-supported by
evidence in the delta.

---

### Gap ID: GAP-DIFF-001
**Status**: [NEW] NEW ISSUE
**Category**: Change Coverage / Testing Feasibility
**Priority**: MEDIUM
**PRD_DELTA Requirement**: FR-BULK-6 ("Provide automated tests… in the existing
`node:test` style covering the sum, per-line discount, and rejection paths").
**TDD_DELTA Coverage**: §D9 states: *"Because `app` is exported, route tests can drive
the handler in-process (Express `app` is a request listener) without binding a port —
consistent with the baseline's importable design (§3)."*

This claim is not technically accurate as the sole testing mechanism, and the delta
does not specify a concrete HTTP-invocation strategy. Evidence:
- `package.json` (read directly) has **zero devDependencies** — no `supertest`, no
  `node-mocha-http`, nothing that can synthesize an HTTP request/response pair against
  an Express app in-process without a live socket.
- `src/app.test.js` (read directly) only imports `priceWidget`, never `app` — the
  existing tests never exercise an HTTP route at all, so there is no established
  in-repo pattern for "driving the handler in-process without binding a port" to
  extend from.
- Express's `app` is a `(req, res)` request-listener function, but invoking it
  directly requires hand-rolled mock `req`/`res` objects (with `.query`, `.json()`,
  `.status()`, etc.) — a nontrivial amount of new test-harness code that §D9 does not
  mention as required work.
- The realistic no-new-dependency alternative is `app.listen(0)` (ephemeral port) +
  Node's built-in global `fetch` per test, then `server.close()` — which **does** bind
  a port (briefly), directly contradicting the "without binding a port" claim.

**Impact**: The build phase has no concrete, validated instruction for *how* to write
the 8 new-behavior HTTP-level tests listed in §D9 items 1–8. Without a specified
mechanism, implementers may (a) add an undeclared new dependency (contradicts §D1
"no new dependency"), (b) write brittle hand-rolled req/res mocks, or (c) silently
fall back to only testing a refactored-out `parseItems` helper instead of the actual
route — under-testing the route wiring, status codes, and JSON envelope that FR-BULK-1
through FR-BULK-5 actually require.
**Fix Required**: Add one sentence to §D9 specifying the concrete mechanism, e.g.:
*"Tests start the app on an ephemeral port (`app.listen(0)`) inside a `test.before`/
per-test setup, issue requests with Node's built-in global `fetch`, assert on
`response.status` and the parsed JSON body, and call `server.close()` in a
`test.after`/`finally` block. No new dependency (e.g., `supertest`) is introduced."*
This one-line addition removes ambiguity and keeps the "no new dependency" claim in
§D1 consistent with §D9.

---

### Gap ID: GAP-DIFF-002
**Status**: [NEW] NEW ISSUE
**Category**: API Contract / Input Robustness
**Priority**: MEDIUM
**PRD_DELTA Requirement**: FR-BULK-3 ("Input parsing… `items` is a comma-separated
list") and FR-BULK-4 ("Invalid-line handling… results in `400` with an `error`
message, mirroring the existing `/price` error contract").
**TDD_DELTA Coverage**: §D4 pseudocode assumes `req.query.items` is always a string:
`raw = req.query.items; if raw is missing/empty → 400 ...; tokens = raw.split(',')`.

Express (via the `qs` query-string parser it uses by default) does **not** always
produce a string for a query parameter:
- A repeated parameter — `GET /price/bulk?items=10:2&items=100:2` — produces
  `req.query.items` as an **array** (`['10:2', '100:2']`).
- A bracketed parameter — `GET /price/bulk?items[a]=10:2` — produces an **object**.

Neither `Array.prototype` nor a plain object has a `.split` method, so
`raw.split(',')` throws `TypeError: raw.split is not a function`. §D4 says the whole
handler body is wrapped in the existing `try/catch → 400 { error: e.message }` idiom,
so this **is** caught — but the resulting response is
`400 { "error": "raw.split is not a function" }`, which (a) leaks an internal
implementation detail (property/method name) in a client-facing error message, and
(b) does not match any of the four documented error strings in `API_CONTRACTS.md` §3
("items is required" / "too many items…" / "invalid item…" / "qty must be positive").
This is inconsistent with the contract table added to `API_CONTRACTS.md` §3, which
implies those four messages are exhaustive.
**Impact**: A caller who accidentally repeats the `items` parameter (a plausible
integration mistake, e.g., a client library that appends rather than joins array
values into the query string) receives an unreviewed, non-contractual error message
instead of a clean, documented `400`. Low likelihood, but a real and easily-triggered
edge case, and the fix is a one-line guard.
**Fix Required**: Add a type check to §D4 step 1–2, e.g.: *"1a. if `typeof raw !==
'string'` → `400 { error: "items is required" }` (treat non-string `items` — arrays
from repeated params, objects from bracket syntax — the same as missing)."* Add this
as a corresponding row/note in `API_CONTRACTS.md` §3 request parameters, and add one
test case to §D9 (`?items=10:2&items=100:2` → `400`).

---

### Gap ID: GAP-DIFF-003
**Status**: [NEW] NEW ISSUE
**Category**: Change Coverage / Documentation
**Priority**: LOW
**PRD_DELTA Requirement**: §7 "Communication plan: announce the new endpoint to
internal consumers (**README / API notes**). No breaking-change notice needed."
**TDD_DELTA Coverage**: §D2 (ripple-effect table) and §D8 (infrastructure/deployment
impact) do not mention `README.md`. Verified directly: the current `README.md` lists
only `GET /health` and `GET /price` and has no line for `/price/bulk`.
**Impact**: Minor documentation drift — the PRD_DELTA's own communication plan
requirement (§7) has no corresponding design-level task in the TDD_DELTA, so it could
be silently dropped during implementation with nothing in the TDD to catch it.
**Fix Required**: Add one line to §D2 or §D8: *"`README.md`'s endpoint list (currently
two `GET` rows) must be updated to add the `GET /price/bulk?items=...` row as part of
this change, per PRD_DELTA §7's communication plan."*

---

### Gap ID: GAP-DIFF-004
**Status**: [NEW] NEW ISSUE
**Category**: API Contract / Test Coverage
**Priority**: LOW
**PRD_DELTA Requirement**: §8 Testing Strategy — edge cases including "Malformed
token (e.g., `items=10`, `items=10:2:3`, `items=abc:2`)."
**TDD_DELTA Coverage**: §D4 step 5b correctly rejects tokens where
`parts.length !== 2`, which handles `10:2:3` (3 parts) and `10` (1 part) — but §D9's
test list (items 1–8) never explicitly enumerates an "empty-token" case produced by
adjacent/trailing delimiters, e.g. `items=10:2,,100:2` (empty string between two
commas) or `items=10:2,` (trailing comma). Under the §D4 algorithm, an empty token
`''` splits on `:` into `['']` (length 1) and correctly falls into the "invalid item"
branch — so the *design* handles it — but §D9 does not list it as a required test,
so a build-phase implementer has no explicit acceptance criterion forcing this case
to be exercised.
**Impact**: Low — the documented algorithm already produces correct behavior for this
input, so this is a test-completeness gap, not a design defect. Risk is only that an
implementation deviates (e.g., via a naive `.filter(Boolean)` "cleanup" of tokens that
silently drops empty entries and mis-sums) without a test catching it.
**Fix Required**: Add one bullet to §D9's new-behavior test list: *"9. Adjacent/
trailing delimiter — `items=10:2,,100:2` and `items=10:2,` → `400 { error: "invalid
item ''" }`."*

---

### Gap ID: GAP-DIFF-005
**Status**: [NEW] NEW ISSUE
**Category**: Security / Threat Model Completeness
**Priority**: LOW
**PRD_DELTA Requirement**: §6 Modified NFRs — "Security: unchanged posture… The only
new security-relevant note is the unbounded-`items` DoS surface (Q3/§11)."
**TDD_DELTA Coverage**: §D7 Security Impact addresses the unbounded-length DoS vector
(mitigated by the 50-item cap) and confirms no injection sink. It does **not**
mention the non-string `req.query.items` case from GAP-DIFF-002, which is a
security-adjacent concern (uncontrolled error message content reflecting internal
JS runtime error text back to the caller — a minor information-disclosure pattern,
distinct from the already-covered CPU/allocation DoS vector).
**Impact**: Low — the information disclosed (`"raw.split is not a function"`) reveals
only that the input is parsed with `.split`, not a secret or stack trace. Still, it is
an unreviewed error-message path that bypasses the "no injection sink, values flow
only into arithmetic" assurance §D7 gives for the *string* input path.
**Fix Required**: Once GAP-DIFF-002 is fixed (type-check before `.split`), add one
clause to §D7: *"Non-string `items` (repeated-param arrays, bracketed objects) is
type-checked and rejected as `400 { error: "items is required" }` before any
`.split`/`.toString` occurs, avoiding reflection of runtime error text to the
caller."* This closes the loop between D4, D7, and the API contract.

---

## Dimensions With No Gaps Found (Evidence-Based)

- **Backward Compatibility**: `/price` and `/health` handlers in `src/app.js` are
  read verbatim and are untouched by the proposed change; §D1/§D6 correctly state
  "byte-for-byte unchanged" and no versioning is introduced or needed for a purely
  additive `GET` route.
- **Data Migration**: Confirmed N/A — no DB driver in `package.json`, no schema files
  anywhere in the repo; §D5 correctly states none is needed.
- **Rollback**: §D8's single-commit-revert plan is consistent with the stateless,
  additive nature of the change and matches the base `DEPLOYMENT_STRATEGY.md`
  ("rollback… means deploying a prior git revision").
- **Consistency with Base Architecture**: The new route reuses `priceWidget` unchanged,
  the same local `try/catch → 400 { error }` idiom, and the same `{ total }` envelope
  — verified against `src/app.js` and `API_CONTRACTS.md` §1–2. No new layering
  (routes/controllers/services) is introduced, consistent with base TDD §3.
- **Open-Question Closure**: All six PRD_DELTA §9 open questions (Q1–Q6) are resolved
  in TDD_DELTA §D3 with documented rationale, and the resolutions are already
  reflected in `API_CONTRACTS.md` §3 (worked examples, exhaustive error list) — a
  concrete implementation-ready contract, not a restated open question.
