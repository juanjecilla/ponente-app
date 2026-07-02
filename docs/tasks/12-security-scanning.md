# Task 12: Security Scanning

**Phase:** 7
**Estimated Effort:** 1.5 hours
**Dependencies:** 00
**See:** ADR 0001.

---

## Context

Four complementary free-for-OSS tools cover different surfaces: Dependabot (known CVEs + update PRs), Socket.dev (supply-chain/malicious packages), CodeQL (SAST on TS/React), and ESLint security plugins (lint-time). GitHub secret scanning + push protection block credential leaks.

## Goal

All four scanners active on PRs, secret scanning enforced, and CodeQL a required status check.

---

## Implementation Steps

### 12.1 Dependabot — `.github/dependabot.yml`
- Ecosystems: `npm` (weekly) + `github-actions` (weekly). Group minor/patch to reduce PR noise.

### 12.2 Socket.dev
- Install the Socket GitHub App on the repo (free for OSS). It comments on PRs that add risky dependencies.

### 12.3 CodeQL — `.github/workflows/codeql.yml`
- `github/codeql-action` with `languages: javascript-typescript`; trigger on PR + push to `main` + weekly schedule.
- Add `CodeQL` as a **required status check** (task 00 / branch protection).

### 12.4 ESLint security
- `eslint-plugin-security` + `eslint-plugin-no-secrets` already in the ESLint config (task 00); verify rules active and failing CI on violation.

### 12.5 GitHub native
- Settings → Code security: **secret scanning** + **push protection** ON (blocks Firebase keys/Google creds from landing).

---

## Corner Cases & Gotchas
- **Firebase web API keys are NOT secrets** (they're public identifiers) — push protection may flag patterns; document why committing `.env.example` (empty) is fine and real keys live in CI vars / `.env.local`.
- **Service account JSON IS secret** — must never be committed; ensure it's only in GitHub secrets.
- **Socket vs Dependabot overlap:** they're complementary (behavior vs CVE), not redundant (ADR 0001). Don't drop one.
- **CodeQL noise:** triage initial alerts; suppress false positives with justification, don't blanket-ignore.
- **Dependabot churn:** grouping + a sane schedule prevents PR floods that stall CI minutes.
- **no-secrets false positives:** high-entropy strings (hashes in tests) may trip it — allowlist specific lines, not the rule.

## Definition of Done
- [ ] Dependabot opening grouped weekly PRs.
- [ ] Socket.dev commenting on dependency PRs.
- [ ] CodeQL running + required for merge.
- [ ] ESLint security/no-secrets failing CI on violations.
- [ ] Secret scanning + push protection enabled.
