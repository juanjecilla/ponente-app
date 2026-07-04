# Deployment

Ponente is a pure React SPA served by **Firebase Hosting** (Spark / free tier).
Deploys are automated through GitHub Actions — you should rarely need to deploy
by hand.

- **Push to `main`** → [`deploy.yml`](../.github/workflows/deploy.yml) builds and
  deploys to the **live** (production) channel.
- **Open / update a PR** → [`preview.yml`](../.github/workflows/preview.yml)
  builds and deploys to a **preview channel**, comments the URL on the PR, then
  runs Lighthouse against it.

Project: `ponente-app` (see [`.firebaserc`](../.firebaserc)) · Domain: `ponente.app`.

---

## Required GitHub configuration

All build-time `VITE_*` values are inlined by `vite build`, so CI **must** inject
them or the deployed app ships with `undefined` config (blank/erroring app).
Mirror the keys in [`.env.example`](../.env.example).

### Secrets (Settings → Secrets and variables → Actions → Secrets)

| Secret | Purpose |
|--------|---------|
| `FIREBASE_SERVICE_ACCOUNT` | JSON key for the CI service account used by `action-hosting-deploy`. Prefer a service account over a CI token. Easiest to generate with `firebase init hosting:github`. |
| `VITE_FIREBASE_API_KEY` | Firebase web app config |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase web app config |
| `VITE_FIREBASE_PROJECT_ID` | Firebase web app config |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase web app config |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase web app config |
| `VITE_FIREBASE_APP_ID` | Firebase web app config |

Firebase web config keys are **not secret** (they ship in the client bundle), but
they are kept as GitHub secrets for cleanliness and to match the workflow env
blocks. You may instead store them as repo **Variables** and switch the workflow
references from `secrets.*` to `vars.*` — pick one and be consistent.

Added by later tasks (inject the same way once the features land):

| Variable / Secret | Task |
|-------------------|------|
| `VITE_RECAPTCHA_SITE_KEY` | 17 — App Check (reCAPTCHA v3) |
| `VITE_SUPABASE_URL` | 07 — photo storage |
| `VITE_SUPABASE_ANON_KEY` | 07 — photo storage |
| `VITE_SENTRY_DSN` | 13 — observability |
| `VITE_SENTRY_TRACES_SAMPLE_RATE` | 13 — observability |
| `VITE_FIREBASE_MEASUREMENT_ID` | Analytics |

> When you add a new `VITE_*` key, add it to **both** `deploy.yml` and
> `preview.yml` build `env:` blocks and to `.env.example`.

---

## Production deploy (`main` → live)

On every push to `main`, `deploy.yml`:

1. `npm ci`
2. `npm run build` with the `VITE_*` env injected
3. Deploys `dist/` to the Firebase Hosting **live** channel via
   `FirebaseExtended/action-hosting-deploy`.

A `concurrency` group (`deploy-main`, `cancel-in-progress: false`) serializes
production deploys so overlapping merges don't race.

---

## Preview deploys (PRs)

On every PR targeting `main`, `preview.yml`:

1. Builds the app (same `VITE_*` env as production).
2. Deploys to a preview channel (7-day expiry) and posts the URL as a PR comment.
3. Runs Lighthouse CI against the preview URL.

**Fork PRs:** repo secrets are not exposed to PRs from forks, so the preview job
is guarded by
`if: github.event.pull_request.head.repo.full_name == github.repository` and will
**skip** for external contributors. A maintainer can push the branch to the repo
(or re-run) to get a preview.

---

## Firestore rules & indexes

Rules and indexes are **not** deployed by the hosting workflows — deploy them
explicitly so production doesn't drift from
[`firestore.rules`](../firestore.rules) /
[`firestore.indexes.json`](../firestore.indexes.json):

```bash
# both
firebase deploy --only firestore --project ponente-app

# or granularly
firebase deploy --only firestore:rules --project ponente-app
firebase deploy --only firestore:indexes --project ponente-app
```

Run this whenever `firestore.rules` or `firestore.indexes.json` change. (A future
iteration may fold this into `deploy.yml`; today it is a manual step.)

---

## OAuth authorized domains

Google sign-in only works on origins listed under **Firebase console → Auth →
Settings → Authorized domains**. Make sure these are present:

- `ponente-app.web.app` and `ponente-app.firebaseapp.com` (default hosting)
- `ponente.app` (custom domain, once connected)
- `ponente-app--*.web.app` — the **preview wildcard**, or sign-in silently fails
  on every preview channel (easy to miss).

App Check note: preview origins must also be allowed for reCAPTCHA, or App Check
enforcement (task 17) breaks previews. Keep enforcement off until previews are
allowlisted, or use the debug provider for preview builds.

---

## Hosting cache headers

Configured in [`firebase.json`](../firebase.json):

- `/assets/**` — Vite emits content-hashed filenames, so they are served with
  `Cache-Control: public, max-age=31536000, immutable` (1 year).
- `/index.html` and `/service-worker.js` — `no-cache, no-store,
  must-revalidate`, so clients always fetch the latest entry point and pick up
  the newest hashed assets immediately after a deploy.

The SPA rewrite (`** → /index.html`) and the `firestore` block are unchanged.

---

## Custom domain (optional)

1. Firebase console → Hosting → **Add custom domain** → `ponente.app`.
2. Update DNS records as instructed by Firebase.
3. Add `ponente.app` to the authorized domains above.

---

## Manual deploy (rarely needed)

```bash
npm ci
npm run build            # needs the VITE_* vars in your local .env
firebase deploy --only hosting --project ponente-app
firebase deploy --only firestore --project ponente-app
```

Requires the Firebase CLI (`npm i -g firebase-tools`) and an account with access
to the `ponente-app` project.
