# Test Gap Analysis — Iteration 3 (Review Pass 3)

## Status: All blocking gaps closed. 0 HIGH, 0 MEDIUM open. 2 LOW/informational open (non-blocking).

## Previously-Open Gaps — Resolution Status

### Gap 1 (HIGH) — Aggregate-sum overflow in `/price/bulk` — **CLOSED**

- **Original finding (Pass 2):** `total += priceWidget(qty, unit)` (`src/app.js`, then-line ~50) never re-validated the accumulator after each addition. 50 lines each individually finite could sum past `Number.MAX_VALUE` to `Infinity`, silently returned as `200 { "total": null }`.
- **Fix:** `src/app.js:63-65` — `if (!Number.isFinite(total)) return res.status(400).json({ error: 'total is too large' });`, placed inside the loop immediately after the addition (`src/app.js:57`).
- **Test:** `src/app.test.js:272-277` — `bulk: rejects when the SUM of valid line items overflows to Infinity (Q2a)`. Uses 50× `1e307:1` (each line finite individually; sum overflows). Asserts `400 { error: 'total is too large' }`.
- **Confirmed via authoritative run:** `TEST_EXECUTION_REPORT.md` line 232-236, `ok 39 - bulk: rejects when the SUM of valid line items overflows to Infinity (Q2a)`, `duration_ms: 9.077358`.
- **Coverage confirms both branch outcomes exercised:** `lcov.info` `BRDA:63,26,0,1` (guard hit, both true via the new test and false via ~83 other passing bulk-total additions across the rest of the suite).
- **Upstream formalization:** now a named requirement, TDD §D3/Q2a, with matching `API_CONTRACTS.md` example — this is no longer just a QA-flagged issue but a spec'd, implemented, tested requirement.

### Gap 2 (MEDIUM) — oversized single numeric token — **Previously closed (pass 1→2), reconfirmed present**

- `src/app.test.js:230-242` — two tests for a 400-digit qty/unit token that overflows `Number(...)` to `Infinity`. Still passing (`ok 35`, `ok 36` in TEST_EXECUTION_REPORT.md).

### Gap 3 (LOW) — non-GET verb rejection — **Previously closed (pass 1→2), reconfirmed present**

- `src/app.test.js:212-222` — parametrized loop over POST/PUT/DELETE for both `/price` and `/price/bulk`, 6 tests total, all confirmed passing (`ok 29`-`ok 34`).

### Gap 4 (LOW) — negative qty / negative unit — **Previously closed (pass 1→2), reconfirmed present**

- `src/app.test.js:201-205` (bulk negative unit), `:247-251` (bulk negative qty), `:256-260` (single-item negative unit). All confirmed passing.

## Remaining Open Gaps (non-blocking, informational — carried forward, optional for iteration 4)

### Gap 5 (LOW) — No explicit `Content-Type` header assertion

- Every test relies on `res.json()` succeeding, which implicitly requires a JSON-parseable body but does not explicitly assert `Content-Type: application/json` on the response headers.
- **Risk:** low — Express's `res.json()` always sets this header; a regression here is unlikely and would be caught indirectly (body parsing would still succeed for JSON regardless of header, so this genuinely only covers the header contract itself, not functional behavior).
- **Suggested test (optional, iteration 4):**
  ```js
  test('bulk: success response has Content-Type: application/json', withServer(async (base) => {
    const res = await fetch(`${base}/price/bulk?items=10:2`);
    assert.match(res.headers.get('content-type'), /application\/json/);
  }));
  ```

### Gap 6 (LOW) — No combined "50-items AND discount-threshold" interaction test

- The 50-item cap boundary test (`app.test.js:109-114`) uses `1:1` items (no discount). The discount-threshold test (`app.test.js:193-197`) uses a single item. No single test currently combines both: 50 items where some/all trigger the ≥100-qty 10% discount.
- **Risk:** very low — both code paths (cap check at `src/app.js:41-43`, discount calc inside `priceWidget` at `src/app.js:15-17`) are independently well-covered; the only untested interaction is purely additive (summing N discounted values), and the general "sums discounted totals across line items" test (`app.test.js:40-44`) already exercises the discount+sum interaction at small scale.
- **Suggested test (optional, iteration 4):**
  ```js
  test('bulk: 50 items all at discount threshold sum correctly', withServer(async (base) => {
    const items = Array.from({ length: 50 }, () => '100:2').join(',');
    const { status, body } = await getJson(`${base}/price/bulk?items=${items}`);
    assert.strictEqual(status, 200);
    assert.deepStrictEqual(body, { total: 9000 }); // 50 * (100*2*0.9)
  }));
  ```

## Gap Summary Table

| # | Severity | Description | Status |
|---|---|---|---|
| 1 | HIGH | Aggregate-sum overflow (Q2a) | **CLOSED this iteration** |
| 2 | MEDIUM | Oversized single token overflow | Closed (prior iteration) |
| 3 | LOW | Non-GET verb rejection | Closed (prior iteration) |
| 4 | LOW | Negative qty/unit handling | Closed (prior iteration) |
| 5 | LOW | Content-Type header assertion | Open — optional |
| 6 | LOW | 50-items + discount interaction | Open — optional |

No new gaps identified in this pass beyond the two pre-existing LOW/informational items, which do not block deployment.
