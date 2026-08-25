# Security Audit — Issue #1, Iteration 3

## Scope

`GET /price/bulk` — the one new route added in this iteration. Baseline
posture: `SECURITY_DESIGN.md` (no auth, no TLS-in-app, no rate limiting; both
existing routes are public compute endpoints).

## Threat Surface Delta

| Vector | Baseline (`/price`) | New (`/price/bulk`) | Change? |
|--------|----------------------|----------------------|---------|
| Authentication | None | None | No change — consistent with baseline. |
| Authorization | None | None | No change. |
| Transport (TLS) | Not in app | Not in app | No change. |
| Input validation | `qty > 0` only; `unit` unvalidated; `NaN` passes through as `null`,`200` | `qty > 0` per line (via `priceWidget`); `unit` unvalidated (same as baseline); **`NaN` explicitly rejected with `400`** (stricter than `/price`) | **Improvement** for the new route — closes the `NaN`-passthrough robustness gap noted in `PRD.md` §11 risks, but only for `/price/bulk`; `/price` itself is untouched (out of scope, correctly not modified). |
| DoS / unbounded work | Single line, O(1) | **Bounded to 50 items** (`MAX_BULK_ITEMS`), O(n) with n≤50 | **Improvement** — directly addresses the unbounded-`items` DoS concern flagged in `PRD_DELTA_issue-1.md` §5.5 and §9 Q3. |
| Information disclosure | N/A (single value) | Type-guard (`typeof raw !== 'string'`) prevents internal JS runtime error text (e.g. `TypeError: raw.split is not a function`) from leaking in the `error` field | **Improvement** — only the four documented error strings are ever returned; no stack traces or internal exception messages are reflected to the client. |
| CORS | Unconfigured (Express default) | Unconfigured (Express default) | No change. |
| Secrets | N/A | N/A | No change — no secrets touched or introduced. |

## Findings

**No new vulnerabilities introduced.** The new endpoint's security posture is
at least as strong as the baseline `/price` endpoint on every dimension, and
strictly better on three: NaN rejection, bounded input (DoS), and
error-message hygiene (no internal-error leakage).

No CRITICAL, HIGH, or MEDIUM security findings.

**LOW / informational**: like `/price`, `/price/bulk` does not validate `unit`
for negativity — a caller could submit a negative unit price per line and
receive a negative line/aggregate total. This is consistent with existing,
already-accepted baseline behavior (`PRD.md` §7, §13 Q3: "no validation exists,
assumed acceptable for trusted internal callers") and is not a regression
introduced by this change. Tracked as GAP-REV-001 (optional test coverage) in
`GAP_ANALYSIS.md`, not a security gate failure.

## Verdict

**PASS** — no new attack surface beyond the documented, accepted "public
compute endpoint, no auth" posture; the change measurably improves several
defensive properties without altering the threat model.
