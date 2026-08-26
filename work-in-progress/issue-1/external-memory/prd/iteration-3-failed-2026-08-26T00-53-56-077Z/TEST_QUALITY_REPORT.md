# Test Quality Report — Iteration 3

**Repository**: hershbhargava/cw-test-brownfield · **Issue**: #1 · **Branch**: `feature/issue-1`

## ⛔ Metrics provenance notice

Per GATE-INTEGRITY rule 5, all test counts/pass-fail/coverage figures must come **only**
from the authoritative `qa-test-execution` metadata at
`work-in-progress/issue-1/external-memory/prd/iteration-3/metadata.json`. That file
**does not exist** — the `prd/iteration-3` directory contains only `FINAL_AI_PROMPT.md`.
Git history shows a `qa-test-execution` commit (`bc3dec4`) once wrote a
`metadata.json`/`TEST_EXECUTION_REPORT.md` to this exact path, but `HEAD` no longer
contains it at that path (superseded by a later `iteration-3-failed-*` rename). This
review therefore contains **zero execution-derived metrics** (no pass/fail counts, no
coverage %). Everything below is a **static** review of test/source code as committed
on `feature/issue-1` — it does not assert anything about a live test run.

---

## Scope reviewed

| File | Role |
|---|---|
| `src/app.js` | Express app: `/health`, `/price`, `/price/bulk`, `priceWidget` |
| `src/app.test.js` | `node:test` suite — 28 `test(...)` blocks (counted statically from source, not from an execution report) |

## Per-file quality assessment

### `src/app.test.js` — Score: 82/100 (static quality only; NOT a coverage/pass score)

**Strengths**
- **Real HTTP harness, no framework bloat**: `withServer()` (`src/app.test.js:19-31`) boots
  the actual exported `app` on an ephemeral port (`app.listen(0)`) and tears it down in a
  `finally` block — every bulk/regression test exercises the real Express routing/JSON
  serialization, not a mocked handler.
- **Specific assertions**: uses `assert.strictEqual` / `assert.deepStrictEqual` throughout
  (e.g. `src/app.test.js:43,49,55,62`) — no generic `assert.ok`/`toBeTruthy` patterns.
- **Independence**: each `test()` opens its own server instance and closes it; no shared
  mutable state or ordering dependency between tests.
- **Determinism**: no timers, randomness, or wall-clock assertions. The one arithmetic
  edge case (`0.1 + 0.2` float artifact, `src/app.test.js:58-63`) is intentionally chosen
  to be deterministic and catches a real rounding regression.
- **Descriptive naming**: names read as scenario + expected outcome (e.g. `"bulk: rejects
  token with too many colons"`, `src/app.test.js:84`), aiding traceability.
- **Regression guard**: 3 pre-existing `priceWidget` unit tests (lines 6-14) and 3
  `/health`+`/price` HTTP regression tests (lines 138-154) are preserved unchanged.

**Weaknesses**
- **No `describe()` grouping**: 28 flat `test()` calls with comment-header dividers
  (`// ── ... ───`) instead of `test.describe` blocks. Works fine under `node:test`, but
  loses structural grouping in TAP/reporter output and makes it harder to run a subset
  (e.g. `--test-name-pattern`) by feature area.
  - *File*: `src/app.test.js` (whole file).
- **No `beforeEach`/`afterEach`**: server lifecycle is duplicated per-test via the
  `withServer` helper rather than a shared `test.beforeEach`/`afterEach` hook binding one
  server for a `describe` block. Current approach is *correct and independent*, just
  slightly more verbose/slower (one `listen`/`close` per test) than necessary.
- **No negative-path test for `/price` missing params entirely** (only `qty=abc` is
  tested for the `NaN` pass-through, `src/app.test.js:180-184`); an entirely absent
  `qty`/`unit` query string exercises the identical `Number(undefined)` → `NaN` code path
  but is not explicitly asserted.
- **No method/verb tests**: no test asserts that `POST /price/bulk` (or other non-`GET`
  verbs) falls through to Express's default 404/405, despite `TDD.md` §5/API_CONTRACTS
  describing the surface as `GET`-only.

### `src/app.js` — Score: 78/100 (implementation quality, informs testability — not a coverage figure)

- `priceWidget` (lines 4-18) and the `/price/bulk` handler (lines 32-63) are pure/local,
  keeping the code trivially unit- and HTTP-testable without mocks — a positive for test
  quality (matches `TDD.md` §3's "importable, testable without a live server" design).
- Error handling is a single local `try/catch → 400 { error }` idiom, consistently
  reused by both `/price` and `/price/bulk` (lines 24-25, 60-62), which the test suite
  exercises for every rejection path added by issue #1.
- Documented, intentional divergence between `/price`'s legacy `NaN → 200 { total: null
  }` pass-through and `/price/bulk`'s stricter `Number.isFinite` rejection (lines 5-14,
  51-56) — both behaviors are explicitly covered by tests (lines 180-184 vs 159-169),
  which is good TDD hygiene: the *documented quirk* is locked in by a test, not just
  prose.

## Overall test-suite quality score: **80/100** — static/structural quality only

This score reflects code-review quality of the test suite as written (independence,
assertion specificity, naming, determinism). **It is not a pass-rate or coverage score**
— no such execution data is available for this iteration (see provenance notice above).
