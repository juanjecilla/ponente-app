# Task 11: Deployment (Firebase Hosting)

**Phase:** 6
**Estimated Effort:** 2 hours
**Dependencies:** 00 (workflows scaffolded), 01 (build)

---

## Context

Firebase Hosting (Spark, free) serves the SPA. PRs deploy to **preview channels** (auto-URL comment, 7-day expiry); merges to `main` deploy to **production**. CI build needs the `VITE_*` env as secrets/vars. This task makes the workflows from task 00 actually deploy and wires secrets/authorized domains.

## Goal

Green preview deploy on PRs and production deploy on merge, with all required secrets and OAuth authorized domains configured.

---

## Implementation Steps

### 11.1 Hosting config
- `firebase.json` hosting (from task 01) + firestore rules/indexes (task 03).
- Confirm SPA rewrite `** → /index.html`.

### 11.2 Service account
- Create a CI service account / use `firebase init hosting:github`, store JSON as `FIREBASE_SERVICE_ACCOUNT` secret. Prefer service account over CI token.

### 11.3 Preview workflow (`preview.yml`, from task 00)
- `FirebaseExtended/action-hosting-deploy` with `channelId: pr-${{ github.event.number }}`, `expires: 7d`. Auto-posts URL.
- Build step needs `VITE_*` (use repo **variables** for non-secret config; **secrets** for anything sensitive). Firebase web config keys are not secret but keep them as repo vars for cleanliness.

### 11.4 Production workflow (`deploy.yml`)
- On push to `main`: build → `action-hosting-deploy` to live channel.
- Deploy rules/indexes too: a step `firebase deploy --only firestore:rules,firestore:indexes` (or include in hosting action config).

### 11.5 OAuth authorized domains
- Add live domain + custom domain + **preview wildcard** (`<project>--*.web.app`) so login works on previews (task 02).

### 11.6 Custom domain (optional)
- Connect `ponente.app` in Hosting; update DNS; add to authorized domains.

---

## Corner Cases & Gotchas
- **Env at build time:** `import.meta.env.VITE_*` is inlined during `vite build`; if CI lacks them, the deployed app has `undefined` config → blank/erroring app. Verify each workflow injects them.
- **Preview OAuth:** without the preview wildcard in authorized domains, sign-in fails only on previews — easy to miss.
- **App Check on previews:** preview origins need to be allowed for reCAPTCHA, or App Check enforcement breaks previews (task 17). Consider keeping enforcement off until previews are allowlisted, or use debug provider for preview builds.
- **Rules drift:** deploying hosting without rules/indexes leaves prod stale — deploy them in the same pipeline.
- **Cache headers:** configure long cache for hashed assets, no-cache for `index.html`.
- **Fork PRs:** secrets aren't exposed to fork PRs by default → preview deploy will skip for external contributors; document (maintainers can re-run). 

## Definition of Done
- [ ] PR → preview channel deploy with URL comment; app loads + login works on preview.
- [ ] Merge to `main` → production deploy; rules + indexes deployed too.
- [ ] `FIREBASE_SERVICE_ACCOUNT` + `VITE_*` configured in CI.
- [ ] Authorized domains include live + preview wildcard.
- [ ] index.html no-cache, hashed assets cached.
