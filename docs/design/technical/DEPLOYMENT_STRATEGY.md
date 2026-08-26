# Deployment Strategy — widget-service

> Reverse-engineered from `package.json`, `src/app.js`, `.gitignore`, `README.md`.
> Documents how the app is **actually** built, run, and tested today. Where common
> deployment artifacts are absent, that absence is stated explicitly.

## Build

- **No build step.** The service is plain CommonJS JavaScript with no transpiler or
  bundler. Source runs as-is under Node.js.
- **Dependencies**: a single runtime dependency, `express ^4.19.2` (`package.json`).
  Install with `npm install` (produces `node_modules/`, which is git-ignored via
  `.gitignore`).

## Run

- **Start command**: `npm run start` → `node src/app.js` (`package.json` scripts).
- **Listen**: the server binds `0.0.0.0:3000` implicitly via `app.listen(3000)`
  (port hardcoded in `src/app.js`). The port is **not** configurable through env.
- **Bootstrap guard**: `if (require.main === module) app.listen(3000);` — importing
  the module (e.g. in tests) does not start the server.

## Test

- **Command**: `npm run test` → `node --test src/` (built-in Node test runner).
- **Coverage**: unit tests target the `priceWidget` pure function only
  (`src/app.test.js`). There are no HTTP/integration tests.

## Environment / Config

- No environment variables are read anywhere in the code. There is no `.env`,
  `config/`, or `dotenv` usage. Runtime behavior is fixed at code level.

## Containerization & Orchestration

- **Not present.** There is no `Dockerfile`, no `docker-compose.yml`, and no
  Kubernetes/Helm manifests in the repository.

## CI/CD

- **Not present.** There is no `.github/workflows/`, no CI config (e.g. GitLab CI,
  CircleCI), and no IaC (Terraform, CloudFormation, etc.) in the repository.

## Observability

- **Logging**: none. No logging library and no `console.*` calls in `src/app.js`.
- **Metrics / tracing**: none.
- **Health/readiness**: `GET /health` returns `{ ok: true }` unconditionally and
  can serve as a liveness probe. There is no separate readiness endpoint and the
  health check does not verify any dependencies (there are none).

## Rollback

- No release/rollback tooling exists in the repo. Given the stateless design and
  single dependency, rollback in practice means deploying a prior git revision of
  `src/app.js`. No database migrations or stateful concerns constrain rollback.

## Deployment Topology (as implied by code)

A single stateless Node process listening on port 3000. Because there is no state,
the process is horizontally replicable behind any external load balancer/TLS
terminator; none of that infrastructure is defined within this repository.
