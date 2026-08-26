# Iteration 4 Guidance

## Priority 0 — Fix QA test-execution infrastructure (blocking, not a code/test task)

The single biggest blocker is **process**, not test code: `qa-test-execution` has
attempted iteration 3 30+ times without a surviving, authoritative
`prd/iteration-3/metadata.json`/coverage artifact (see `COVERAGE_GAP_ANALYSIS.md` for
full root-cause). **Before writing more tests**, get one clean `qa-test-execution` run
to completion and let its output persist unsuperseded. This review cannot become a PASS
without that artifact, regardless of test-code quality (GATE-INTEGRITY rule 6).

## Priority 1 — Close the two MEDIUM/HIGH test gaps

### 1. Non-`GET` verb rejection (HIGH — TEST_GAP_ANALYSIS #1)

Add to `src/app.test.js` (near the existing 404 regression test, ~line 190):

```js
// PRD §6: GET-only, JSON-only interface — non-GET verbs should not be handled.
test('regression: POST to /price/bulk falls through to default 404', withServer(async (base) => {
  const res = await fetch(`${base}/price/bulk?items=10:2`, { method: 'POST' });
  assert.strictEqual(res.status, 404);
}));

test('regression: POST to /price falls through to default 404', withServer(async (base) => {
  const res = await fetch(`${base}/price?qty=10&unit=2`, { method: 'POST' });
  assert.strictEqual(res.status, 404);
}));
```

### 2. Oversized single-token numeric string (MEDIUM — EDGE_CASE_REVIEW #1)

Add near the "over-cap" tests (~line 107):

```js
// TDD §D7: item-count cap (50) bounds request size, but does NOT bound the length of
// an individual token. Confirm a very large (still finite) numeric string is handled
// without hanging/crashing — Number(...) on an oversized digit string yields Infinity
// once it exceeds Number.MAX_VALUE, which /price/bulk already rejects via
// Number.isFinite (src/app.js:54). This test locks in that the existing guard also
// covers pathologically long digit strings, not just 1e400-style literals.
test('bulk: rejects a single oversized numeric token (long digit string)', withServer(async (base) => {
  const hugeDigits = '9'.repeat(400); // exceeds Number.MAX_VALUE -> Infinity
  const { status, body } = await getJson(`${base}/price/bulk?items=${hugeDigits}:2`);
  assert.strictEqual(status, 400);
  assert.deepStrictEqual(body, { error: `invalid item '${hugeDigits}:2'` });
}));
```

## Priority 2 — LOW gaps (nice-to-have, small diffs)

### 3. Explicit negative `qty` (distinct from zero)

```js
test('bulk: rejects negative qty (distinct from zero)', withServer(async (base) => {
  const { status, body } = await getJson(`${base}/price/bulk?items=-5:2`);
  assert.strictEqual(status, 400);
  assert.deepStrictEqual(body, { error: 'qty must be positive' });
}));
```

### 4. Negative `unit` on single-item `/price` (mirrors existing bulk test at `src/app.test.js:201-205`)

```js
test('regression: /price accepts negative unit price (documented, unvalidated)', withServer(async (base) => {
  const { status, body } = await getJson(`${base}/price?qty=10&unit=-2`);
  assert.strictEqual(status, 200);
  assert.deepStrictEqual(body, { total: -20 });
}));
```

## File location

All templates append to the existing `src/app.test.js` — no new test file needed; the
project's single-file `node:test` convention (per `TDD.md` §2, `package.json:8`) should
be preserved.

## Expected outcome next iteration

- 4 new `test()` blocks (2 HIGH/MEDIUM + 2 LOW) → 32 total test cases (static count).
- Once `qa-test-execution` produces a surviving `coverage/lcov.info` at
  `prd/iteration-4/` (or wherever the next authoritative slot lands), re-run
  `COVERAGE_GAP_ANALYSIS` for real numbers — none are estimated here.
