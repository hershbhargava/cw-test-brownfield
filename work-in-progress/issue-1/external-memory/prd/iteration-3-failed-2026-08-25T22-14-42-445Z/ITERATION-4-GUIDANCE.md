# Iteration Guidance — Issue #1 (following iteration 3 QA review, post-fix)

## Priority 0 — Coverage gate evaluability (process, not code)

The coverage gate is **NOT-EVALUABLE** because the qa-test-execution harness
invoked the plain `npm test` (`node --test src/`) rather than the
`test:coverage` script (`node --experimental-test-coverage --test src/`)
already added to `package.json` in this iteration's dev-fix pass. No code or
test change can fix this from within the developer/QA autonomous roles — it
requires the qa-test-execution phase's invocation command to be pointed at
`npm run test:coverage` (or equivalent `c8`/`nyc` wrapper). This is flagged
for human/pipeline-owner attention (GATE-INTEGRITY Rule 4: CI/pipeline
invocation changes are out of autonomous scope) and is **not** assigned as a
developer action item.

## Priority 3 (LOW) — Optional numeric-coercion strengthening tests

These are not required by any TDD/PRD requirement and do not block release
on their own; they close minor gaps found in this review (see
`TEST_GAP_ANALYSIS.md` GAP-N1–N3). Copy-paste ready, following the existing
`withServer`/`getJson` harness already in `src/app.test.js`:

```js
// GAP-N1: explicit negative-qty assertion (currently only qty=0 is tested;
// negative shares the same `qty <= 0` guard but has no direct test).
test('bulk: rejects negative qty (not just zero)', withServer(async (base) => {
  const { status, body } = await getJson(`${base}/price/bulk?items=-5:2`);
  assert.strictEqual(status, 400);
  assert.deepStrictEqual(body, { error: 'qty must be positive' });
}));

test('price: rejects negative qty (not just zero)', withServer(async (base) => {
  const { status, body } = await getJson(`${base}/price?qty=-5&unit=2`);
  assert.strictEqual(status, 400);
  assert.deepStrictEqual(body, { error: 'qty must be positive' });
}));

// GAP-N2: document/lock in Number()'s hex-literal coercion behavior.
// This currently SUCCEEDS (0x10 === 16) rather than being rejected — if that
// is not the intended contract, the fix belongs in a future iteration's
// parsing logic, not in this test (this test only documents current behavior
// so a future change to reject non-decimal literals doesn't regress silently
// without a test needing to change).
test('bulk: documents Number() hex-literal coercion (0x10 -> 16)', withServer(async (base) => {
  const { status, body } = await getJson(`${base}/price/bulk?items=0x10:2`);
  assert.strictEqual(status, 200);
  assert.deepStrictEqual(body, { total: 32 }); // 16 * 2, no discount (qty<100)
}));

// GAP-N3: document/lock in Number()'s whitespace-trimming coercion behavior.
test('bulk: documents Number() whitespace coercion ( 10 : 2 )', withServer(async (base) => {
  const { status, body } = await getJson(`${base}/price/bulk?items=${encodeURIComponent(' 10 : 2 ')}`);
  assert.strictEqual(status, 200);
  assert.deepStrictEqual(body, { total: 20 });
}));
```

**Note on GAP-N2/N3 templates**: these assert the *current* (accepting)
behavior rather than proposing a behavior change — deliberately, since
whether hex/whitespace tolerance should be rejected is a product decision
(new validation rule), not a bug. If a future iteration decides to tighten
parsing to reject non-plain-decimal tokens, these two tests would need to be
updated to expect `400` instead — that is an intentional, human-reviewable
contract change, not something this guidance prescribes unilaterally.

## What is explicitly NOT needed

- No change to `priceWidget`, the Infinity guard, or the `/price/bulk`
  finite-check — all correct and fully tested this iteration.
- No change to the 50-item cap, delimiter parsing, or error-message shapes.
- No lowering, removal, or bypass of any gate.
