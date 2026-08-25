const test = require('node:test');
const assert = require('node:assert');
const { priceWidget } = require('./app');

test('prices without discount under 100', () => {
  assert.strictEqual(priceWidget(10, 2), 20);
});
test('applies 10% discount at 100+', () => {
  assert.strictEqual(priceWidget(100, 2), 180);
});
test('rejects non-positive qty', () => {
  assert.throws(() => priceWidget(0, 2));
});
