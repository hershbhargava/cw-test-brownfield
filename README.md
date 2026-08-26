# widget-service

Internal widget pricing service (Node.js/Express). Existing codebase.

- `GET /health` — liveness
- `GET /price?qty=&unit=` — compute discounted total
- `GET /price/bulk?items=qty:unit,qty:unit` — summed discounted total across line
  items (URL-encode `items`; max 50 items). Any malformed line rejects the whole
  request with `400`.

Run tests: `npm test`
