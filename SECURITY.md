# Security Policy

## Supported versions

Ponente is a continuously deployed web app; only the currently deployed version
of `main` is supported. There are no long-lived release branches.

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues,
discussions, or pull requests.**

Instead, report privately via
[**GitHub Security Advisories**](https://github.com/juanjecilla/ponente-app/security/advisories/new).
This creates a private channel between you and the maintainers.

If you cannot use Security Advisories, email **juanje.cilla@gmail.com** with:

- A description of the vulnerability and its impact
- Steps to reproduce (proof-of-concept if possible)
- Affected component / file paths
- Any suggested remediation

## Response SLA

- **Acknowledgement** within **3 business days**.
- **Triage + severity assessment** within **7 business days**.
- We aim to ship a fix or mitigation for confirmed high/critical issues within
  **30 days**, and will keep you updated on progress.

## Disclosure

We follow **coordinated disclosure**. Once a fix is deployed, we will publish an
advisory crediting the reporter (unless you prefer to remain anonymous).

## Scope

In scope: the Ponente web app, its Firestore security rules, and its CI/build
configuration. Out of scope: vulnerabilities in third-party services (Firebase,
Supabase, Photon) — report those to the respective vendors. Denial-of-service via
free-tier quota exhaustion is a known constraint, not a vulnerability.

## Hardening already in place

- Firebase **App Check** (reCAPTCHA v3) on Firestore
- Firestore **security rules** enforce ownership, the publish gate, and admin-field locks
- **CodeQL** + ESLint security plugins (`eslint-plugin-security`, `eslint-plugin-no-secrets`) for SAST on every PR
- **Dependabot** — weekly grouped npm + GitHub Actions update PRs (known CVEs)
- **Dependency Review** — blocks PRs that introduce high-severity vulnerabilities or disallowed (strong-copyleft) licenses in newly added dependencies
- **Socket.dev** (supply-chain / malicious-package behaviour) commenting on dependency PRs
- Secret scanning + push protection on the repository

These four scanners are complementary, not redundant: Dependabot + Dependency
Review cover known CVEs, Socket.dev covers supply-chain behaviour, and
CodeQL + ESLint cover source-level (SAST) issues. See ADR 0001.

## Secrets vs. public identifiers

- **Firebase web API keys are public identifiers, not secrets.** Committing an
  empty `.env.example` is fine; real values live in CI variables / `.env.local`.
  If push protection flags a Firebase config pattern, it is a false positive.
- **Firebase service-account JSON _is_ secret** and must never be committed — it
  lives only in GitHub Actions secrets.
