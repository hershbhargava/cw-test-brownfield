# Performance Review — dev-review iteration 4

## Date: 2026-10-13T23:21:07.068Z
## Repository: hershbhargava/cw-test-brownfield · Issue #1
## Scope: `GET /price/bulk` (the only new/changed endpoint this feature introduces)

## Summary

The service performs only synchronous, in-memory numeric arithmetic with no I/O, no
database, no caching layer, and no network calls other than the inbound HTTP request
itself. Performance risk surface is therefore narrow and is dominated by a single
question: is per-request work bounded? It is.

## Algorithmic Complexity

- `priceWidget(qty, unitPrice)` — O(1): a fixed 2-element loop (finiteness check over
  `[qty, unitPrice]`) plus constant-time arithmetic. Called once per `/price` request,
  up to 50 times per `/price/bulk` request.
- `GET /price/bulk` handler (`src/app.js:32-71`) — O(N) in the number of comma-separated
  tokens in `items`, where N is capped at `MAX_BULK_ITEMS = 50` (`src/app.js:31,41-43`).
  Each iteration does: one `String.split(':')` (O(token length), tokens are small
  `qty:unit` pairs), two `Number()` coercions, one `priceWidget` call (O(1)), one
  finiteness check on the running sum (O(1)). Total worst-case work per request is
  bounded and small — no unbounded loops, no recursion, no nested iteration over the
  same collection.
- No sorting, no repeated scans, no quadratic patterns anywhere in the diff.

## Amplification / DoS Bound (re-verified, not just re-read)

- The arch-review (iteration-4, GAP-DIFF-003) and the developer's fix both document
  `MAX_BULK_ITEMS = 50` as the bound on this amplification vector. This review
  independently confirmed, by reading the code directly (not the docs), that the bound
  is real and enforced *before* any per-item work is performed: the length check at
  `src/app.js:41-43` runs immediately after the split, before the processing loop
  begins — so a request with, say, 10,000 tokens is rejected in O(1) (after one
  `split`) rather than partially processed. ✅ Correctly front-loaded.
- Memory: `raw.split(',')` materializes the full token array before the count check.
  For a pathological `items` string that splits into far more than 50 tokens, this means
  one `split` call over the full raw string length happens before rejection. Given HTTP
  query-string length is already bounded by Node/Express's default header-size limits
  (and no custom increase of those limits was found anywhere in `src/app.js`), this is
  not considered an exploitable amplification vector — it is bounded by the same
  default limits that bound every other query parameter in this app, and is consistent
  with the already-accepted, documented risk posture in `SECURITY_DESIGN.md`
  ("primary risk is generic unauthenticated request volume rather than data exposure").
  Not a new finding; not escalated to a gap.

## Response Payload Size

- All 3 endpoints return small, fixed-shape JSON objects (`{ ok: true }`,
  `{ total: <number> }`, `{ error: <string> }`). No unbounded array/object is ever
  serialized back to the client. No performance concern.

## Latency / Blocking

- All work is synchronous CPU-bound arithmetic on small inputs (≤50 items). No handler
  blocks the Node.js event loop for any duration that could be considered significant
  (microseconds, not milliseconds, for 50 iterations of simple arithmetic). No async/
  await, no promises, no setTimeout — nothing to misuse here.

## Test Evidence

`src/app.test.js` includes a regression test exercising the upper bound (50 items,
including an aggregate-overflow case using `1e307:1` repeated to force summation toward
`Infinity`) — confirming the overflow guard activates correctly under worst-case
numeric input rather than hanging or crashing. This was re-run as part of this review's
`npm test` execution (39/39 passing).

## Conclusion

**0 performance gaps found.** The bulk endpoint's only amplification vector (item count)
is bounded, enforced early, and already covered by tests. No performance remediation is
required for issue #1.
