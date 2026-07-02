# Task 17: App Check (reCAPTCHA v3)

**Phase:** 10
**Estimated Effort:** 1.5 hours
**Dependencies:** 01, 03 (rules to enforce against)

---

## Context

App Check (reCAPTCHA v3, invisible) verifies that Firestore/Remote Config requests come from the real app, deterring bots and scripted abuse — important because reports and writes are otherwise only auth-gated. It must initialize **before** Firestore. Debug tokens are required for dev + CI or enforcement rejects those requests.

## Goal

App Check initialized before Firestore, debug tokens working in dev/CI, enforcement enabled on Firestore (and Remote Config) after verification.

---

## Implementation Steps

### 17.1 reCAPTCHA v3 key
- Register the site in the reCAPTCHA admin (v3) or via Firebase console App Check; copy the site key → `VITE_RECAPTCHA_SITE_KEY`.

### 17.2 Init — top of `src/lib/firebase.ts`, BEFORE `getFirestore`
```typescript
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

if (import.meta.env.DEV && import.meta.env.VITE_APPCHECK_DEBUG) {
  // @ts-expect-error debug token global
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = import.meta.env.VITE_APPCHECK_DEBUG;
}
initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
  isTokenAutoRefreshEnabled: true,
});
// ...then getFirestore(app)
```

### 17.3 Debug tokens
- Dev: set `self.FIREBASE_APPCHECK_DEBUG_TOKEN = true` once, copy the generated token from console logs, **register it** in Firebase console App Check → Debug tokens.
- CI: register a CI debug token; expose via `VITE_APPCHECK_DEBUG` build var for preview builds (or use the debug provider for non-prod builds).

### 17.4 Enforcement
- Enable enforcement on **Firestore** (and optionally Remote Config) in console **only after** dev + CI debug tokens verified working.

---

## Corner Cases & Gotchas
- **Init order:** App Check must init before `getFirestore`/first request, or early requests are unverified/rejected. Keep it at the very top of `firebase.ts`.
- **Breaks local/CI/preview if enforced without debug tokens** — the #1 failure mode. Wire tokens first; enable enforcement last.
- **Preview channels:** each preview origin must be allowed by reCAPTCHA (domain list) or use the debug provider for preview builds (task 11).
- **Supabase not covered:** App Check guards Firebase only; the Supabase bucket relies on its own RLS (ADR 0004).
- **reCAPTCHA domain config:** add `localhost`, live, and preview domains to the reCAPTCHA key's allowed domains.
- **Graceful absence:** if `VITE_RECAPTCHA_SITE_KEY` missing (e.g. a contributor's local), App Check init should fail soft in dev (skip init) rather than crash the app.
- **Token refresh:** `isTokenAutoRefreshEnabled: true` so long sessions don't expire mid-use.

## Definition of Done
- [ ] App Check initialized before Firestore with reCAPTCHA v3.
- [ ] Debug tokens registered + working in dev and CI/preview.
- [ ] Enforcement enabled on Firestore; verified requests show "verified" in console.
- [ ] App still runs locally without a site key (soft-skip in dev).
- [ ] Reports/writes succeed with App Check on; rejected when token invalid.
