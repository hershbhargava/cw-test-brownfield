# Coverage Gap Analysis — Iteration 3

## Coverage gate status: **UNAVAILABLE — not collected by qa-test-execution; gate not evaluable**

Per GATE-INTEGRITY rule 6, no coverage percentage is stated, copied, or estimated
anywhere in this review. This gate **cannot** be PASS this iteration.

### Why coverage is unavailable (root cause, for remediation — not a metric)

1. The authoritative source named for this review,
   `work-in-progress/issue-1/external-memory/prd/iteration-3/metadata.json`, **does not
   exist** on disk. The `prd/iteration-3` directory contains only `FINAL_AI_PROMPT.md`.
2. `git log` on `feature/issue-1` shows the `qa-test-execution` role has attempted this
   exact iteration **30+ times** (folders `prd/iteration-3-failed-2026-08-25T*` through
   `...-2026-08-26T00-33-14-849Z`), and a `qa-test-env-author` role has repeatedly
   rewritten `.coweave/manifest.yml` / `.coweave/Dockerfile.test-runner` in between
   attempts (commits `ac9f072`, `ef35b87`, `61a9e66`, `c4d0b14`, `fd10470`, `04dd23a`,
   `e236d7c`, and a revert `eb6feb2` — "coverage must be authored by the workflow, not
   hand-patched"). The most recent commit (`bc3dec4`) did write a `metadata.json` +
   `TEST_EXECUTION_REPORT.md` + `reports/_artifacts/0/lcov.info` to the `prd/iteration-3`
   path, but `HEAD` no longer contains those files at that path — they were superseded
   before this review ran.
3. Net effect: **no lcov/coverage artifact is currently committed at the authoritative
   location for this review to read.** This is a QA-infrastructure reliability gap, not
   a statement about the application's real coverage level.

### What IS configured (structural check, not a coverage number)

- `package.json` defines `"test:coverage": "node --experimental-test-coverage --test
  src/"` (`package.json:9`), i.e. Node's built-in coverage instrumentation is available.
- `.coweave/manifest.yml` (`spec.tests.command`) currently invokes `node --test
  --experimental-test-coverage --test-reporter=spec ... --test-reporter=lcov
  --test-reporter-destination=coverage/lcov.info src/` — coverage collection **is wired
  into the test-environment command**, provided the container build (Pattern A,
  `.coweave/Dockerfile.test-runner`) succeeds and the run is allowed to complete and
  persist its artifacts before being superseded by a retry.

### Files that would need coverage attention once a report exists

Cannot be determined without a real lcov report — do not guess. Once
`coverage/lcov.info` is produced and persisted at the authoritative iteration path,
re-run this analysis to identify:
- Files/lines with 0% coverage (highest priority)
- Branches below threshold (default 70% per review template; **no project-specific
  threshold config was found** — no `.nycrc`, `.c8rc`, or jest `coverageThreshold` in
  the repo, so the generic 70% default applies until a project owner sets one)

## Recommendation

Do not attempt to hand-patch or re-author `.coweave/manifest.yml`/`Dockerfile.test-runner`
again from the QA-review role (out of scope — gate/tooling changes are for
`qa-test-env-author`/human owners, not this reviewer). Instead: **re-run
`qa-test-execution` to completion once and let its output persist at
`prd/iteration-3/metadata.json` without being superseded**, then re-run this QA review
against that authoritative artifact.
