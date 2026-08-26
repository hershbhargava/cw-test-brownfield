# Iteration 4 Guidance

**For:** developer implementation pass following this QA review.
**Priority order:** HIGH finding must be fixed before this issue is deployment-ready. LOW items are optional polish.

## 1. HIGH — Fix aggregate sum overflow in `GET /price/bulk` (blocking)

**File:** `src/app.js`
**Location:** the accumulation loop, lines 44-58.

### Root cause

```js
let total = 0;
for (const token of tokens) {
  const parts = token.split(':');
  if (parts.length !== 2) {
    return res.status(400).json({ error: `invalid item '${token}'` });
  }
  const qty = Number(parts[0]), unit = Number(parts[1]);
  if (!Number.isFinite(qty) || !Number.isFinite(unit)) {
    return res.status(400).json({ error: `invalid item '${token}'` });
  }
  total += priceWidget(qty, unit); // <-- total itself is never re-validated
}
res.json({ total: +total.toFixed(2) });
```

Each `qty`/`unit` is checked for finiteness, but `total` accumulates unchecked. 50 individually-finite line items can sum past `Number.MAX_VALUE` into `Infinity`, which serializes as JSON `null`.

### Suggested fix (minimal, additive, matches existing error-shape conventions)

```js
    let total = 0;
    for (const token of tokens) {
      const parts = token.split(':');
      if (parts.length !== 2) {
        return res.status(400).json({ error: `invalid item '${token}'` });
      }
      const qty = Number(parts[0]), unit = Number(parts[1]);
      if (!Number.isFinite(qty) || !Number.isFinite(unit)) {
        return res.status(400).json({ error: `invalid item '${token}'` });
      }
      total += priceWidget(qty, unit);
      if (!Number.isFinite(total)) {
        return res.status(400).json({ error: 'total is too large' });
      }
    }
    res.json({ total: +total.toFixed(2) });
```

This checks the invariant *inside* the loop (fail fast, same all-or-nothing 400 contract as every other validation branch in this handler) rather than only at the end, and reuses the exact `Number.isFinite` idiom already established at line 54 for consistency.

### Test template (add to `src/app.test.js`, e.g. under a new "Iteration 6" banner)

```js
// ── Iteration 6: QA-review blocker fix — aggregate sum overflow ────────────
// HIGH: 50 individually-finite line items can still overflow the running sum
// past Number.MAX_VALUE to Infinity, which JSON-serializes as null with a 200 —
// contradicting the per-token finite guard's stated purpose (src/app.js:51-53).
test('bulk: rejects when the SUM of valid line items overflows to Infinity', withServer(async (base) => {
  const items = Array.from({ length: 50 }, () => '1e307:1').join(',');
  const { status, body } = await getJson(`${base}/price/bulk?items=${items}`);
  assert.strictEqual(status, 400);
  assert.deepStrictEqual(body, { error: 'total is too large' });
}));
```

Run `node --test src/` after applying both changes to confirm 39/39 passing (38 existing + 1 new), and re-run coverage to confirm the new branch at the `if (!Number.isFinite(total))` line is hit both when true (new test) and false (all 37 existing passing bulk-success/error tests where `total` stays finite).

## 2. LOW (optional) — Explicit branch-exclusion comment on the entrypoint guard

**File:** `src/app.js:66`

```js
/* c8 ignore next */
if (require.main === module) app.listen(3000);
```

Purely cosmetic — makes the intentionally-unreachable-under-test branch explicit in coverage tooling output instead of showing as a stray uncovered line. Not required; branch coverage already clears threshold without it (see `COVERAGE_GAP_ANALYSIS.md`).

## 3. LOW (optional) — Combined boundary test: 50 items all at discount threshold

**File:** `src/app.test.js`, near line 109 (`accepts exactly 50 items (boundary)`)

```js
test('bulk: accepts exactly 50 items all at the discount threshold', withServer(async (base) => {
  const items = Array.from({ length: 50 }, () => '100:2').join(',');
  const { status, body } = await getJson(`${base}/price/bulk?items=${items}`);
  assert.strictEqual(status, 200);
  assert.deepStrictEqual(body, { total: 9000 }); // 50 * (100*2*0.9)
}));
```

Closes the minor interaction-coverage gap noted in `TEST_GAP_ANALYSIS.md` Gap 2 (count-cap × discount interaction at the boundary). Not blocking.

## Not required this iteration

- `Content-Type` header assertions (`TEST_GAP_ANALYSIS.md` Gap 3) — nice-to-have, no action needed now.
- No changes needed to `/price` (single-item endpoint) — it has no aggregation step, so this overflow class doesn't apply there; its existing `Infinity`/`NaN` handling (L171-184) is correct and unaffected by this fix.
