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
  assert.throws(() => priceWidget(0, 2));
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
