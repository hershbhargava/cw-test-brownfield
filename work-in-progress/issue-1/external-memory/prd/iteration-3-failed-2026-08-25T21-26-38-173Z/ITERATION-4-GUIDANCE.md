# Iteration 4 Guidance — Issue #1

Target file: `/persistent/git-workspaces/hershbhargava/cw-test-brownfield/issue-1/repos/hershbhargava/cw-test-brownfield/src/app.test.js`
(append to the existing `node:test` suite; same imports/helpers already present
at the top of the file — `withServer()` and `getJson()` — reuse them, do not
redefine).

## Priority 1 (HIGH) — `Infinity`/non-finite numeric input

**This test will FAIL against the current implementation** (`src/app.js`) —
that is expected and correct: it documents the real bug found in this review
(`EDGE_CASE_REVIEW.md`). Add it as a red test, then fix `src/app.js` to make
it green.

```javascript
// Add to the "GET /price/bulk — error paths" section, near the existing NaN test.
test('bulk: rejects non-finite (Infinity-producing) token', withServer(async (base) => {
  const { status, body } = await getJson(`${base}/price/bulk?items=1e400:2`);
  assert.strictEqual(status, 400);
  assert.deepStrictEqual(body, { error: "invalid item '1e400:2'" });
}));
```

```javascript
// Baseline /price has the same gap — add to the "regression" section.
test('regression: /price rejects non-finite qty (Infinity)', withServer(async (base) => {
  const { status, body } = await getJson(`${base}/price?qty=1e400&unit=2`);
  assert.strictEqual(status, 400);
  assert.deepStrictEqual(body, { error: 'qty must be positive' });
}));
```

**Suggested minimal fix** in `src/app.js` (for the bulk handler, line ~41 —
change `Number.isNaN` to also reject non-finite values):

```javascript
// Before:
if (Number.isNaN(qty) || Number.isNaN(unit)) {
  return res.status(400).json({ error: `invalid item '${token}'` });
}
// After:
if (!Number.isFinite(qty) || !Number.isFinite(unit)) {
  return res.status(400).json({ error: `invalid item '${token}'` });
}
```
`Number.isFinite` rejects `NaN`, `Infinity`, and `-Infinity` in one guard,
superseding the narrower `Number.isNaN` check. The `/price` endpoint would
need an equivalent explicit guard added to `priceWidget` or the `/price`
handler if the team decides to close that baseline gap too (currently
`/price`'s `NaN`-passthrough is *documented* as accepted behavior in
`PRD.md` §7 — extending the fix to `/price` is a product decision, not
purely a test-quality one; flagging here for visibility, not prescribing it).

## Priority 2 (MEDIUM) — lock in the documented `/price` NaN-passthrough behavior

Regardless of whether the team later decides to fix it, the *current*
documented behavior (`PRD.md` §7) has no regression test. Add this so any
future accidental change is caught:

```javascript
// Add to the "regression" section.
test('regression: /price returns 200 {total:null} for NaN qty (documented behavior, PRD.md §7)', withServer(async (base) => {
  const { status, body } = await getJson(`${base}/price?qty=abc&unit=2`);
  assert.strictEqual(status, 200);
  assert.deepStrictEqual(body, { total: null });
}));
```

## Priority 3 (LOW) — FR-7 unknown-route coverage

```javascript
// Add to the "regression" section.
test('regression: unknown route returns 404', withServer(async (base) => {
  const res = await fetch(`${base}/nonexistent`);
  assert.strictEqual(res.status, 404);
}));
```

## Priority 3 (LOW) — boundary value just below the discount threshold

```javascript
// Add near the existing discount-threshold tests.
test('prices qty=99 without discount (just below threshold)', () => {
  assert.strictEqual(priceWidget(99, 2), 198); // 99 × 2, no discount
});
```

## Priority 3 (LOW) — strengthen the existing weak assertion

Current (`src/app.test.js:12-14`) only checks that an error is thrown, not
its message:
```javascript
test('rejects non-positive qty', () => {
  assert.throws(() => priceWidget(0, 2));
});
```
Strengthen to assert the message (guards against a future refactor silently
changing the error text that `/price` and `/price/bulk` both surface to
callers):
```javascript
test('rejects non-positive qty', () => {
  assert.throws(() => priceWidget(0, 2), { message: 'qty must be positive' });
});
```

## Coverage Tooling (process change — human decision, see COVERAGE_GAP_ANALYSIS.md)

Not a test-code template, but the single highest-leverage change for iteration
4: enable `node --experimental-test-coverage` in `package.json`'s `test`
script so the next qa-test-execution run produces a real, evaluable coverage
number instead of `null`. This does not require picking new devDependencies
(built into Node ≥18.15, and the repo already runs Node 20).

## Expected Outcome After Iteration 4

- Test count: 21 → 26 (5 new tests above).
- The Priority-1 test starts RED (fails against current `src/app.js`); after
  applying the suggested `Number.isFinite` fix, it goes GREEN.
- All other new tests should pass immediately against the current
  implementation (they document existing, correct behavior that was simply
  unasserted).
- Coverage gate becomes evaluable (no longer `null`) once the tooling change
  is made, unblocking a future PASS-eligible QA verdict.
