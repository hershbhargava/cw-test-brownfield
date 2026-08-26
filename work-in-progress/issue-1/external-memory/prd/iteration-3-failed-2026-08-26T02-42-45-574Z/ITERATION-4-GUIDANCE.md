# Iteration 4 Guidance — Issue #1

## Priority-ordered work

### 1. HIGH — Guard against aggregate/sum-level numeric overflow in `/price/bulk`

**Problem**: `src/app.js:54` only checks that each **individual** token's `qty`/
`unit` is finite. It does not check that the **running sum** stays finite. 50
individually-valid, individually-finite line items (well within the documented cap)
can sum past `Number.MAX_VALUE` to `Infinity`, which `JSON.stringify` serializes as
`total: null` with **HTTP 200** — the exact "nonsensical aggregate `total: null`"
outcome `TDD.md` §D3/Q2 says the NaN/Infinity rejection exists to prevent.

**Suggested code fix** (`src/app.js`, inside the `for (const token of tokens)` loop,
immediately after the `total += priceWidget(qty, unit);` line — do NOT modify
`priceWidget` itself, which is explicitly reused-as-is per `PRD_DELTA_issue-1.md`
§4.3):

```js
total += priceWidget(qty, unit); // throws on qty <= 0 -> caught below
if (!Number.isFinite(total)) {
  return res.status(400).json({ error: 'total is too large' });
}
```

**Test template** (append to `src/app.test.js`, in the bulk error-paths section):

```js
// HIGH gap (QA review iteration 3): the per-token finite guard (src/app.js:54)
// does not protect the RUNNING SUM. 50 individually-finite line items can overflow
// the aggregate to Infinity, which JSON-serializes as `total: null` with a 200 —
// the exact nonsensical-aggregate outcome the per-token guard was built to avoid
// (TDD.md §D3/Q2). This must be rejected with 400, not silently return null/200.
test('bulk: rejects when the SUM of individually-finite line items overflows to Infinity', withServer(async (base) => {
  // Each line total is priceWidget(1e307, 1) = 9e306 (finite). 50 of them
  // (the max allowed by MAX_BULK_ITEMS) sum past Number.MAX_VALUE (~1.7977e308).
  const items = Array.from({ length: 50 }, () => '1e307:1').join(',');
  const { status, body } = await getJson(`${base}/price/bulk?items=${items}`);
  assert.strictEqual(status, 400);
  assert.notStrictEqual(body.total, null); // must NOT be the nonsensical 200/null outcome
  assert.ok(body.error, 'expected an error message, got: ' + JSON.stringify(body));
}));
```

**Coverage target**: closes the one structurally-unexercised path identified in
`COVERAGE_GAP_ANALYSIS.md` (the running-sum branch after `src/app.js:57`).

---

### 2. MEDIUM — Restore the coverage-collection pipeline for the qa-review phase

**Problem**: this review's authoritative source
(`prd/iteration-3/metadata.json` + `TEST_EXECUTION_REPORT.md`) was absent on disk at
review time — a prior phase's artifact-lifecycle step (visible in `git log` as
commit `e36405e` immediately followed by an uncommitted rename into
`prd/iteration-3-failed-2026-08-26T01-01-46-345Z/`) supersedes the qa-test-execution
output before the qa-review phase can read it. This is a **pipeline/process issue**,
not a code defect, but it is blocking every review iteration from evaluating the
coverage gate (GATE-INTEGRITY rule 6 forces `REVIEW_AGAIN`/`FAIL` whenever this
happens, regardless of actual test quality).

**Suggested action** (for the pipeline/workflow owner, not this codebase): ensure
the qa-test-execution phase's `metadata.json`/`TEST_EXECUTION_REPORT.md`/lcov
artifacts remain at the live `prd/iteration-N/` path (or are copied there) at the
moment the qa-review phase starts reading, rather than being renamed into a
`-failed-` folder as part of the *next* phase's own directory bootstrap.

---

### 3. LOW — Optional edge-case polish (not blocking)

These are nice-to-have, low-risk additions; do only if time permits:

```js
// Documents Number()'s hex-string coercion on /price/bulk tokens (shared quirk
// with /price's existing Number(...) coercion — not a new bug, just undocumented
// for the bulk route specifically).
test('bulk: hex-string token is coerced by Number() (documented JS quirk, not bulk-specific)', withServer(async (base) => {
  const { status, body } = await getJson(`${base}/price/bulk?items=0x64:2`);
  assert.strictEqual(status, 200);
  assert.deepStrictEqual(body, { total: 180 }); // Number('0x64') === 100 -> discount applies
}));
```

## Regression guardrails for iteration 4

- Do not modify `priceWidget` (`src/app.js:4-18`) — it is explicitly reused-as-is
  per `PRD_DELTA_issue-1.md` §4.3.
- Do not change the `{ total }` / `{ error }` envelopes, the 50-item cap, or any of
  the 38 existing assertions in `src/app.test.js`.
- Do not add a coverage command to `package.json`'s `test` script (per standing
  developer-iteration instructions in this repo's history).
- The sum-overflow fix should return `400` with an `error` string — consistent with
  every other `/price/bulk` failure mode — not a different status code or envelope.
