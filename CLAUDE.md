# CLAUDE.md — AI agent guide for Ponente

Context for AI agents (and humans) working in this repo. **Read `docs/` first:**
`docs/README.md` → `docs/ARCHITECTURE.md` (source of truth) → `CONTEXT.md`
(domain glossary) → `docs/FIREBASE.md` → `docs/TESTING.md` → `docs/adr/`.

## What this is

Ponente is a React SPA speaker directory on the **Firebase free (Spark) tier**.
Speakers register cities they can travel to + a cost tier; organizers browse
publicly and contact speakers via typed external links. EN/ES from day one.

## Stack

React + Vite + TypeScript (strict) · Tailwind CSS · Firebase (Auth, Firestore,
Hosting, Remote Config, Analytics, Performance, App Check) · Supabase Storage
(default photo backend) · Photon geocoder · react-i18next.

## npm scripts

| Script                            | Purpose                                   |
| --------------------------------- | ----------------------------------------- |
| `npm run dev`                     | Vite dev server                           |
| `npm run build`                   | `tsc -b` + `vite build`                   |
| `npm run typecheck`               | `tsc --noEmit` (strict)                   |
| `npm run lint`                    | ESLint (+ security, jsx-a11y, no-secrets) |
| `npm run format` / `format:check` | Prettier                                  |
| `npm run test` / `test:coverage`  | Vitest (80% thresholds)                   |
| `npm run size`                    | size-limit (300 kB gzip budget)           |

## Project structure

See `docs/ARCHITECTURE.md` for the full tree. Key homes: `src/components/{auth,
profile,directory,shared}`, `src/pages`, `src/hooks`, `src/lib` (incl.
`lib/storage`), `src/types`, `src/i18n`, `src/constants`.

## What NOT to do (hard rules — enforced in review)

- **Do not import Sentry or Firebase Analytics for errors directly.** Use
  `lib/error-tracker.ts` (`errorTracker`). See ADR 0002.
- **Do not call `getStorage()` or import a storage SDK directly.** Go through
  `lib/storage`'s `StorageProvider` (chosen by Remote Config). See ADR 0004.
- **Do not hardcode topics/tags.** Read the `tags` Firestore collection via
  `useTags`. Admins add tags without a redeploy.
- **Do not ship a user-facing feature without a Remote Config flag** so it can be
  killed without a redeploy.
- **Do not hardcode UI strings.** Wrap everything in `t()`; speaker-entered
  content stays verbatim (not translated).
- **Do not maintain `reportCount`, `disabled`, or `gdeVerified` from the client.**
  These are admin-only (Firebase console); the security rules lock them. No Cloud
  Functions on Spark — moderation is manual. See ADR 0005.
- **Do not enforce the publish gate only in the UI.** It is enforced in
  `firestore.rules` (`publishReady`).

## Free-tier constraints

No Cloud Functions · Firebase Storage needs Blaze (→ Supabase default) · Photon
fair-use (debounce + cache + bundled fallback) · Firestore Spark caps
(50k reads / 20k writes per day).

## Workflow

Trunk-based: short-lived `feature/*` branches → PR into `main`. DCO sign-off
required (`git commit -s`). See `CONTRIBUTING.md`.
