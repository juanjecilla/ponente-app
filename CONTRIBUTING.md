# Contributing to Ponente

Thanks for helping build Ponente — a free, open speaker directory for the GDG
and wider tech community. This guide covers local setup, our branching model,
and what every PR is expected to clear.

## Code of Conduct

This project follows the [Contributor Covenant](./CODE_OF_CONDUCT.md). By
participating you agree to uphold it. Report unacceptable behavior via the
channels in `CODE_OF_CONDUCT.md`.

## Development setup

```bash
git clone git@github.com:juanjecilla/ponente-app.git
cd ponente-app
npm install
cp .env.example .env.local   # fill in Firebase + Supabase values
npm run dev
```

Node 20+ is expected (CI runs on Node 20). See `docs/` for the full spec —
start with `docs/README.md`; `docs/ARCHITECTURE.md` is the source of truth.

## Branching model — trunk-based

- `main` is **always deployable**. Every push to `main` deploys to production.
- Work on **short-lived** `feature/*` branches; open a PR into `main`.
- No direct pushes to `main` — branch protection requires a green PR + 1 approval.
- Rebase or squash-merge to keep history linear.

## Sign your commits (DCO)

Every commit must carry a `Signed-off-by:` line — this is the
[Developer Certificate of Origin](https://developercertificate.org/). The DCO
check enforces it on each PR.

```bash
git commit -s -m "feat: add city tier filter"
```

If you forgot on earlier commits, amend or rebase with `-s`.

## What NOT to do (architecture guardrails)

These are enforced in review (and by `CLAUDE.md`):

- **Errors** → go through `lib/error-tracker.ts`; never import Sentry/Analytics directly.
- **Photos** → go through `lib/storage`'s `StorageProvider`; never call `getStorage()` directly.
- **Topics** → read the `tags` Firestore collection; never hardcode a tag list.
- **New user-facing features** → gate behind a Remote Config flag.
- **UI strings** → wrap in `t()`; speaker-entered content stays verbatim.

## Pull request checklist

Before requesting review, confirm:

- [ ] Tests pass (`npm run test`) and coverage is held (≥80%).
- [ ] Type-check, lint, and format are clean.
- [ ] Accessibility checked for any UI change (`vitest-axe` / keyboard + labels).
- [ ] New feature is behind a Remote Config flag (if applicable).
- [ ] All new UI strings are translated (EN + ES).
- [ ] Commits are DCO-signed (`Signed-off-by:` present).

## Automated review

- **CodeRabbit** comments on every PR (security, a11y, coverage focus).
- **Codecov** posts coverage; the patch must stay ≥80%.
- **CodeQL** + **Socket.dev** scan for vulnerabilities and supply-chain risk.

## Reporting security issues

Please do **not** open public issues for vulnerabilities. Follow `SECURITY.md`.
