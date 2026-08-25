const express = require('express');

// Existing business logic — pre-dates CoWeave adoption.
function priceWidget(qty, unitPrice) {
  if (qty <= 0) throw new Error('qty must be positive');
  const discount = qty >= 100 ? 0.1 : 0;
  return +(qty * unitPrice * (1 - discount)).toFixed(2);
}

const app = express();
app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('/price', (req, res) => {
  const qty = Number(req.query.qty), unit = Number(req.query.unit);
  try { res.json({ total: priceWidget(qty, unit) }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

// Bulk pricing (issue #1). Additive: reuses priceWidget per line item, sums the
// discounted line totals, and returns the existing { total } envelope. All-or-
// nothing — any malformed/invalid line rejects the whole request with 400.
const MAX_BULK_ITEMS = 50;
app.get('/price/bulk', (req, res) => {
  try {
    const raw = req.query.items;
    // Non-string (repeated param -> array, bracket syntax -> object) or empty is
    // treated as missing, so we never reflect internal ".split" errors back.
    if (typeof raw !== 'string' || raw === '') {
      return res.status(400).json({ error: 'items is required' });
    }
    const tokens = raw.split(',');
    if (tokens.length > MAX_BULK_ITEMS) {
      return res.status(400).json({ error: `too many items (max ${MAX_BULK_ITEMS})` });
    }
    let total = 0;
    for (const token of tokens) {
      const parts = token.split(':');
      if (parts.length !== 2) {
        return res.status(400).json({ error: `invalid item '${token}'` });
      }
      const qty = Number(parts[0]), unit = Number(parts[1]);
      if (Number.isNaN(qty) || Number.isNaN(unit)) {
        return res.status(400).json({ error: `invalid item '${token}'` });
      }
      total += priceWidget(qty, unit); // throws on qty <= 0 -> caught below
    }
    res.json({ total: +total.toFixed(2) });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = { app, priceWidget };
if (require.main === module) app.listen(3000);
