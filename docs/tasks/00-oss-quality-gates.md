# Task 00: OSS Setup + Quality Gates

**Phase:** 0
**Estimated Effort:** 3–4 hours
**Dependencies:** None
**Blocks:** everything (all feature work develops against these gates)

---

## Context

Ponente is a public OSS project. Quality gates must exist **before** feature code, so every subsequent PR is held to them. All tools here are **free for public repos**: GitHub Actions, CodeQL, CodeRabbit, Codecov, DCO bot. The repo exists at `/Users/juanje/Projects/CodingPit/ponente-app` with remote `git@github.com:juanjecilla/ponente-app.git` and **no commits yet**.

> This task can run partly before scaffolding (community files, repo settings) and partly after `npm` exists (husky, lint configs). Where a step needs `package.json`, it is marked `[after 01]`.

## Goal

Public repo with community files, AI-agent docs, pre-commit hooks, CI (typecheck/lint/format/test/build/size), preview+Lighthouse, prod deploy, security scanning hooks, and branch protection — all green on a trivial first PR.

---

## Implementation Steps

### 0.1 Repo settings (GitHub)
- Public repo. Description + topics: `firebase, react, gdg, speaker-directory, typescript, i18n`.
- Enable Issues + Discussions; disable Wiki.
- Settings → Code security: enable **secret scanning** + **push protection**.

### 0.2 Community files (repo root)
- `CONTRIBUTING.md` — dev setup, **trunk-based** model (`main` always deployable, short-lived `feature/*`), **DCO sign-off** (`git commit -s`), PR checklist, CodeRabbit/Codecov notes.
- `CODE_OF_CONDUCT.md` — Contributor Covenant v2.1.
- `SECURITY.md` — private disclosure via GitHub Security Advisories + response SLA.
- `.github/PULL_REQUEST_TEMPLATE.md` — checklist: tests pass, coverage held, a11y checked, Remote Config flag added if a new feature, **DCO `Signed-off-by:` present**.
- `.github/ISSUE_TEMPLATE/bug_report.md` and `feature_request.md`.
- `.github/FUNDING.yml`:
  ```yaml
  github: [juanje]
  ko_fi: <handle>            # TODO confirm handle
  buy_me_a_coffee: <handle>  # TODO confirm handle
  ```
- `.github/dependabot.yml` — weekly `npm` + `github-actions` ecosystems.

### 0.3 AI-agent entrypoint
- `CLAUDE.md` (repo root) — stack, `npm` scripts, structure, **what NOT to do**: no direct Sentry/Analytics imports (use `ErrorTracker`); no direct storage SDK imports (use `StorageProvider`); no hardcoded tags (read `tags` collection); every new user-facing feature behind a Remote Config flag; all UI strings via `t()`. Point to `docs/`.

### 0.4 `[after 01]` Pre-commit hooks
```bash
npm i -D husky lint-staged
npx husky init
```
- `.husky/pre-commit` → `npx lint-staged`
- `lint-staged` config (package.json): `*.{ts,tsx}` → `eslint --fix`, `*.{ts,tsx,css,json,md}` → `prettier --write`.
- `.husky/commit-msg` → enforce DCO line, OR rely on the **DCO GitHub App** (PR-level). Recommended: DCO App (less local friction).

### 0.5 `[after 01]` ESLint + Prettier
```bash
npm i -D eslint prettier @typescript-eslint/eslint-plugin @typescript-eslint/parser \
  eslint-plugin-react-hooks eslint-plugin-jsx-a11y eslint-plugin-security eslint-plugin-no-secrets
```
- `eslint.config.js`: `@typescript-eslint/recommended` + `react-hooks` + `jsx-a11y` + `security` + `no-secrets`.
- `.prettierrc` + `.prettierignore`.
- Scripts: `lint`, `format`, `format:check`.

### 0.6 `[after 01]` Tests + coverage
```bash
npm i -D vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom vitest-axe
```
- `vitest.config.ts` per `docs/TESTING.md` (jsdom, v8, 80% thresholds, exclude list).
- Scripts: `test`, `test:coverage`.

### 0.7 `[after 01]` Bundle size — **size-limit** (not bundlesize)
```bash
npm i -D size-limit @size-limit/preset-app
```
- `.size-limit.json`: `[{ "path": "dist/assets/*.js", "limit": "300 kB" }]` (gzipped by default).
- Script: `size`.

### 0.8 CI — `.github/workflows/ci.yml` (on `pull_request` → `main`)
Jobs (Node 20, `npm ci`): `typecheck` (`tsc --noEmit`) · `lint` · `format` (`format:check`) · `test` (`test:coverage` → upload to Codecov via `codecov/codecov-action`) · `build` (`vite build`) · `size` (after build).

### 0.9 Preview + Lighthouse — `.github/workflows/preview.yml` (on `pull_request`)
- Deploy to Firebase Hosting **preview channel** via `FirebaseExtended/action-hosting-deploy` (auto-posts URL comment, 7-day expiry).
- Run `@lhci/cli` against the preview URL; assert **a11y ≥90, perf ≥70, best-practices ≥90**; upload report artifact.

### 0.10 Prod deploy — `.github/workflows/deploy.yml` (on push to `main`)
- `vite build` → deploy to Firebase Hosting **live** channel via `action-hosting-deploy` with `FIREBASE_SERVICE_ACCOUNT` (service-account JSON, not a token).

### 0.11 CodeQL — `.github/workflows/codeql.yml`
- `javascript-typescript` analysis on PR + push. (Detailed in task 12.)

### 0.12 External apps (free for OSS)
- **CodeRabbit** (coderabbit.ai) — install on repo; add `.coderabbit.yaml` (language TypeScript; focus security + a11y + coverage).
- **Codecov** — install; `codecov.yml` (project 80%, patch 80%); add `CODECOV_TOKEN` secret.
- **DCO GitHub App** — install (enforces `Signed-off-by:` on PR commits).
- **Socket.dev** — install (task 12).

### 0.13 Branch protection on `main`
- Required checks: `typecheck, lint, format, test, build, size, lighthouse, CodeQL, DCO`.
- 1 approval; dismiss stale reviews on push; no direct push to `main`.

---

## Corner Cases & Gotchas
- **Chicken-and-egg:** community files + repo settings can land in the first commit; hook/lint/test steps need `package.json` from task 01. Order: 0.1–0.3 → task 01 → 0.4–0.7 → push first PR to exercise CI.
- **Secrets needed before CI is green:** `FIREBASE_SERVICE_ACCOUNT`, `CODECOV_TOKEN`, (later) `SENTRY_AUTH_TOKEN`, `VITE_*` build vars. Document which job needs which.
- **App Check + CI:** the build/preview must NOT require a real App Check token; keep App Check init resilient when env vars are absent (task 17).
- **DCO on existing commits:** if early commits lack `Signed-off-by`, the DCO check fails the PR — sign-off from the start (`git commit -s`).
- **Lighthouse flakiness:** perf can vary on shared runners; keep perf threshold at 70 and run a11y as the hard gate.
- **size-limit needs a build:** the `size` job must `needs: build` (or build inline).

## Definition of Done
- [ ] Repo public; Issues/Discussions on; secret scanning + push protection on.
- [ ] All community files + `CLAUDE.md` present; FUNDING handles filled or `TODO`-marked.
- [ ] Husky pre-commit runs lint-staged; DCO enforced (App or hook).
- [ ] `ci.yml`, `preview.yml`, `deploy.yml`, `codeql.yml` present and green on a trivial PR.
- [ ] CodeRabbit comments on PRs; Codecov posts coverage; DCO check present.
- [ ] Branch protection active with all required checks.
