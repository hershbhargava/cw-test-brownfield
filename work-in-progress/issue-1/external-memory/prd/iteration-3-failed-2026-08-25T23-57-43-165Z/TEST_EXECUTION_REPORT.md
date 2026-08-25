# QA Test Execution Report — Iteration 3

**Sandbox:** `issue-1`
**Repository:** hershbhargava/cw-test-brownfield
**Branch:** feature/issue-1
**Duration:** 2.1s
**Exit code:** 1
**Status:** failed

**Failure class:** `setup` (PARTIAL — at least one test suite/workspace failed to START; counts below cover only the suites that ran)

## Summary

- **Total:** 1
- **Passed:** 0 (0%)
- **Failed:** 1
- **Skipped:** 0
- **Result source:** `infra-counts`

> ⚠️ PARTIAL RUN: at least one test suite/workspace failed to START (setup/environment). The counts above cover ONLY the suites that ran; the run as a whole is environment-broken — see **Failure class** `setup`, Notable Errors, and notable_cause.

## stdout (tail)

```

added 68 packages, and audited 69 packages in 1s

15 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities

> widget-service@1.2.0 test
> node --test src/

TAP version 13
# node:internal/modules/cjs/loader:1433
#   throw err;
#   ^
# Error: Cannot find module '/repo/src'
#     at Function._resolveFilename (node:internal/modules/cjs/loader:1430:15)
#     at defaultResolveImpl (node:internal/modules/cjs/loader:1040:19)
#     at resolveForCJSWithHooks (node:internal/modules/cjs/loader:1045:22)
#     at Function._load (node:internal/modules/cjs/loader:1216:25)
#     at wrapModuleLoad (node:internal/modules/cjs/loader:254:19)
#     at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:171:5)
#     at node:internal/main/run_main_module:36:49 {
#   code: 'MODULE_NOT_FOUND',
#   requireStack: []
# }
# Node.js v22.23.2
# Subtest: src
not ok 1 - src
  ---
  duration_ms: 66.296229
  type: 'test'
  location: '/repo/src:1:1'
  failureType: 'testCodeFailure'
  exitCode: 1
  signal: ~
  error: 'test failed'
  code: 'ERR_TEST_FAILURE'
  ...
1..1
# tests 1
# suites 0
# pass 0
# fail 1
# cancelled 0
# skipped 0
# todo 0
# duration_ms 77.424439

```

## stderr (tail)

```
(empty)
```

## Report Files

(none collected)
