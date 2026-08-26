const express = require('express');

// Existing business logic — pre-dates CoWeave adoption.
function priceWidget(qty, unitPrice) {
  // Reject non-finite inputs (Infinity/-Infinity) that would otherwise slip past
  // the qty<=0 guard and produce a nonsensical Infinity total (serialized as JSON
  // null with a 200). NaN is intentionally NOT rejected here so that /price keeps
  // its documented NaN -> { total: null }, 200 passthrough (API_CONTRACTS §"Error
  // semantics"); only finite-number validation is added.
  for (const v of [qty, unitPrice]) {
    if (typeof v === 'number' && !Number.isNaN(v) && !Number.isFinite(v)) {
      throw new Error('qty and unit must be finite');
    }
  }
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
      // Reject non-numeric (NaN) AND non-finite (Infinity, e.g. "1e400") tokens so
      // the bulk sum can never be a nonsensical null/Infinity. Stricter than /price
      // by design (TDD §D3/Q2); keeps all-or-nothing 400 semantics.
      if (!Number.isFinite(qty) || !Number.isFinite(unit)) {
        return res.status(400).json({ error: `invalid item '${token}'` });
      }
      total += priceWidget(qty, unit); // throws on qty <= 0 -> caught below
      // Q2a (TDD §D3): per-line finiteness (above) is necessary but not sufficient —
      // up to MAX_BULK_ITEMS individually-finite line totals can still sum past
      // Number.MAX_VALUE to Infinity, which +(Infinity).toFixed(2) serializes as JSON
      // null with a 200. Re-validate the running sum (fail-fast, all-or-nothing) so the
      // bulk total can never be a nonsensical null/Infinity.
      if (!Number.isFinite(total)) {
        return res.status(400).json({ error: 'total is too large' });
      }
    }
    res.json({ total: +total.toFixed(2) });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = { app, priceWidget };
if (require.main === module) app.listen(3000);
