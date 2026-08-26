const test = require('node:test');
const assert = require('node:assert');
const { app, priceWidget } = require('./app');

// ── Existing unit tests (regression — priceWidget unchanged) ───────────────
test('prices without discount under 100', () => {
  assert.strictEqual(priceWidget(10, 2), 20);
});
test('applies 10% discount at 100+', () => {
  assert.strictEqual(priceWidget(100, 2), 180);
});
test('rejects non-positive qty', () => {
  assert.throws(() => priceWidget(0, 2), { message: 'qty must be positive' });
});

// ── HTTP test harness (issue #1) ───────────────────────────────────────────
// Drives the real Express `app` over an ephemeral port with Node's built-in
// global `fetch`. No new dependency (no supertest) — see architect GAP-DIFF-001.
function withServer(run) {
  return async () => {
    const server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const { port } = server.address();
    const base = `http://127.0.0.1:${port}`;
    try {
      await run(base);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  };
}

async function getJson(url) {
  const res = await fetch(url);
  const body = await res.json();
  return { status: res.status, body };
}

// ── GET /price/bulk — success paths ────────────────────────────────────────
test('bulk: sums discounted totals across line items', withServer(async (base) => {
  const { status, body } = await getJson(`${base}/price/bulk?items=10:2,100:2`);
  assert.strictEqual(status, 200);
  assert.deepStrictEqual(body, { total: 200 }); // 20 + 180
}));

test('bulk: single line item', withServer(async (base) => {
  const { status, body } = await getJson(`${base}/price/bulk?items=10:2`);
  assert.strictEqual(status, 200);
  assert.deepStrictEqual(body, { total: 20 });
}));

test('bulk: applies per-line discount within one request', withServer(async (base) => {
  const { status, body } = await getJson(`${base}/price/bulk?items=100:2,10:2`);
  assert.strictEqual(status, 200);
  assert.deepStrictEqual(body, { total: 200 }); // 180 + 20
}));

test('bulk: final rounding to 2 decimals', withServer(async (base) => {
  // 1×0.1 + 1×0.2 = 0.1 + 0.2 = 0.30000000000000004 without a final round.
  const { status, body } = await getJson(`${base}/price/bulk?items=1:0.1,1:0.2`);
  assert.strictEqual(status, 200);
  assert.deepStrictEqual(body, { total: 0.3 });
}));

// ── GET /price/bulk — error paths (all-or-nothing) ─────────────────────────
test('bulk: rejects a line with non-positive qty (from priceWidget)', withServer(async (base) => {
  const { status, body } = await getJson(`${base}/price/bulk?items=0:2`);
  assert.strictEqual(status, 400);
  assert.deepStrictEqual(body, { error: 'qty must be positive' });
}));

test('bulk: rejects malformed token (non-numeric)', withServer(async (base) => {
  const { status, body } = await getJson(`${base}/price/bulk?items=abc:2`);
  assert.strictEqual(status, 400);
  assert.deepStrictEqual(body, { error: "invalid item 'abc:2'" });
}));

test('bulk: rejects token missing the colon', withServer(async (base) => {
  const { status, body } = await getJson(`${base}/price/bulk?items=10`);
  assert.strictEqual(status, 400);
  assert.deepStrictEqual(body, { error: "invalid item '10'" });
}));

test('bulk: rejects token with too many colons', withServer(async (base) => {
  const { status, body } = await getJson(`${base}/price/bulk?items=10:2:3`);
  assert.strictEqual(status, 400);
  assert.deepStrictEqual(body, { error: "invalid item '10:2:3'" });
}));

test('bulk: rejects missing items param', withServer(async (base) => {
  const { status, body } = await getJson(`${base}/price/bulk`);
  assert.strictEqual(status, 400);
  assert.deepStrictEqual(body, { error: 'items is required' });
}));

test('bulk: rejects empty items param', withServer(async (base) => {
  const { status, body } = await getJson(`${base}/price/bulk?items=`);
  assert.strictEqual(status, 400);
  assert.deepStrictEqual(body, { error: 'items is required' });
}));

test('bulk: rejects more than 50 items', withServer(async (base) => {
  const items = Array.from({ length: 51 }, () => '1:1').join(',');
  const { status, body } = await getJson(`${base}/price/bulk?items=${items}`);
  assert.strictEqual(status, 400);
  assert.deepStrictEqual(body, { error: 'too many items (max 50)' });
}));

test('bulk: accepts exactly 50 items (boundary)', withServer(async (base) => {
  const items = Array.from({ length: 50 }, () => '1:1').join(',');
  const { status, body } = await getJson(`${base}/price/bulk?items=${items}`);
  assert.strictEqual(status, 200);
  assert.deepStrictEqual(body, { total: 50 });
}));

// GAP-DIFF-004: adjacent/trailing delimiters yield an empty token → rejected.
test('bulk: rejects adjacent delimiters (empty token)', withServer(async (base) => {
  const { status, body } = await getJson(`${base}/price/bulk?items=10:2,,100:2`);
  assert.strictEqual(status, 400);
  assert.deepStrictEqual(body, { error: "invalid item ''" });
}));

test('bulk: rejects trailing delimiter (empty token)', withServer(async (base) => {
  const { status, body } = await getJson(`${base}/price/bulk?items=10:2,`);
  assert.strictEqual(status, 400);
  assert.deepStrictEqual(body, { error: "invalid item ''" });
}));

// GAP-DIFF-002: non-string items (repeated param → array) rejected cleanly,
// without leaking internal ".split is not a function" runtime text.
test('bulk: rejects repeated items param (non-string)', withServer(async (base) => {
  const { status, body } = await getJson(`${base}/price/bulk?items=10:2&items=100:2`);
  assert.strictEqual(status, 400);
  assert.deepStrictEqual(body, { error: 'items is required' });
}));

// ── Regression: existing routes unchanged ──────────────────────────────────
test('regression: /health still returns ok', withServer(async (base) => {
  const { status, body } = await getJson(`${base}/health`);
  assert.strictEqual(status, 200);
  assert.deepStrictEqual(body, { ok: true });
}));

test('regression: /price still computes discounted total', withServer(async (base) => {
  const { status, body } = await getJson(`${base}/price?qty=100&unit=2`);
  assert.strictEqual(status, 200);
  assert.deepStrictEqual(body, { total: 180 });
}));

test('regression: /price still rejects non-positive qty', withServer(async (base) => {
  const { status, body } = await getJson(`${base}/price?qty=0&unit=2`);
  assert.strictEqual(status, 400);
  assert.deepStrictEqual(body, { error: 'qty must be positive' });
}));

// ── Iteration 4: QA-review blocker fixes ───────────────────────────────────
// HIGH: non-finite (Infinity-producing) input must be rejected with 400 on BOTH
// endpoints, instead of the pre-fix 200 { total: null }. Number("1e400") === Infinity.
test('bulk: rejects non-finite (Infinity) qty token', withServer(async (base) => {
  const { status, body } = await getJson(`${base}/price/bulk?items=1e400:2`);
  assert.strictEqual(status, 400);
  assert.deepStrictEqual(body, { error: "invalid item '1e400:2'" });
}));

test('bulk: rejects non-finite (Infinity) unit token', withServer(async (base) => {
  const { status, body } = await getJson(`${base}/price/bulk?items=2:1e400`);
  assert.strictEqual(status, 400);
  assert.deepStrictEqual(body, { error: "invalid item '2:1e400'" });
}));

test('price: rejects non-finite (Infinity) qty', withServer(async (base) => {
  const { status, body } = await getJson(`${base}/price?qty=1e400&unit=2`);
  assert.strictEqual(status, 400);
  assert.deepStrictEqual(body, { error: 'qty and unit must be finite' });
}));

// MEDIUM: lock in the documented legacy /price NaN -> { total: null }, 200
// passthrough (API_CONTRACTS §"Error semantics"). The Infinity fix must NOT change
// this behavior — only Infinity is rejected, NaN still passes through.
test('price: NaN qty still passes through as { total: null }, 200 (documented)', withServer(async (base) => {
  const { status, body } = await getJson(`${base}/price?qty=abc&unit=2`);
  assert.strictEqual(status, 200);
  assert.deepStrictEqual(body, { total: null });
}));

// LOW: unknown routes fall through to Express's default 404 (no custom handler).
test('regression: unknown route returns 404', withServer(async (base) => {
  const res = await fetch(`${base}/does-not-exist`);
  assert.strictEqual(res.status, 404);
}));

// LOW: qty=99 is just below the 100 discount threshold -> no discount, in bulk.
test('bulk: qty=99 gets no discount (just below threshold)', withServer(async (base) => {
  const { status, body } = await getJson(`${base}/price/bulk?items=99:2`);
  assert.strictEqual(status, 200);
  assert.deepStrictEqual(body, { total: 198 }); // 99 * 2, no discount
}));

// LOW: negative unit price is accepted (unvalidated) and yields a negative total —
// documents current behavior (TDD §9.2), not a new requirement.
test('bulk: negative unit price yields negative total (documented behavior)', withServer(async (base) => {
  const { status, body } = await getJson(`${base}/price/bulk?items=10:-2`);
  assert.strictEqual(status, 200);
  assert.deepStrictEqual(body, { total: -20 });
}));

// ── Iteration 5: QA-review gap closures (add-tests only; impl unchanged) ───────
// HIGH gap: the service registers GET routes only (src/app.js). Any non-GET verb to
// a known path has no matching handler and must fall through to Express's default
// 404 (API_CONTRACTS §"Undefined routes": "POST /price ... returns 404"). These lock
// that contract in so a future non-GET route can't be added silently/unintentionally.
for (const method of ['POST', 'PUT', 'DELETE']) {
  test(`regression: ${method} /price is not handled (404, GET-only)`, withServer(async (base) => {
    const res = await fetch(`${base}/price?qty=10&unit=2`, { method });
    assert.strictEqual(res.status, 404);
  }));

  test(`regression: ${method} /price/bulk is not handled (404, GET-only)`, withServer(async (base) => {
    const res = await fetch(`${base}/price/bulk?items=10:2`, { method });
    assert.strictEqual(res.status, 404);
  }));
}

// MEDIUM gap: the 50-item cap bounds item COUNT, not per-token string LENGTH. An
// absurdly long single digit-string token overflows Number(...) to Infinity (beyond
// Number.MAX_VALUE ≈ 1.8e308), which the finite guard (src/app.js:54) rejects with
// 400. This closes the "unbounded single-token" sub-case of the TDD §D7/D10 DoS
// surface that the count cap alone doesn't cover. (The shorter `1e400` literal form
// is already covered above at the "rejects non-finite (Infinity)" tests.)
test('bulk: rejects an absurdly long digit-string qty token (overflow → Infinity)', withServer(async (base) => {
  const hugeQty = '9'.repeat(400); // Number(hugeQty) === Infinity
  const { status, body } = await getJson(`${base}/price/bulk?items=${hugeQty}:2`);
  assert.strictEqual(status, 400);
  assert.deepStrictEqual(body, { error: `invalid item '${hugeQty}:2'` });
}));

test('bulk: rejects an absurdly long digit-string unit token (overflow → Infinity)', withServer(async (base) => {
  const hugeUnit = '9'.repeat(400); // Number(hugeUnit) === Infinity
  const { status, body } = await getJson(`${base}/price/bulk?items=2:${hugeUnit}`);
  assert.strictEqual(status, 400);
  assert.deepStrictEqual(body, { error: `invalid item '2:${hugeUnit}'` });
}));

// LOW gap: negative qty in a bulk line must be rejected via priceWidget's qty<=0
// guard — a DISTINCT case from the existing `items=0:2` zero-boundary test, proving
// the guard covers strictly-negative (not just zero) quantities.
test('bulk: rejects a line with negative qty (distinct from zero)', withServer(async (base) => {
  const { status, body } = await getJson(`${base}/price/bulk?items=-5:10`);
  assert.strictEqual(status, 400);
  assert.deepStrictEqual(body, { error: 'qty must be positive' });
}));

// LOW gap: single-item /price with a negative unit is accepted (unit is unvalidated,
// TDD §9.2) and yields a negative total — mirrors the existing bulk negative-unit
// test but on /price, documenting current behavior (NOT a new requirement).
test('price: negative unit price yields negative total (documented behavior)', withServer(async (base) => {
  const { status, body } = await getJson(`${base}/price?qty=10&unit=-3`);
  assert.strictEqual(status, 200);
  assert.deepStrictEqual(body, { total: -30 }); // 10 * -3, no discount below 100
}));
