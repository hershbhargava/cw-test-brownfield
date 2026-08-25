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

module.exports = { app, priceWidget };
if (require.main === module) app.listen(3000);
