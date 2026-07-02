# Sentry Observability: Targeted Capture, UID-Only, Error-Only Replay

We use Sentry for runtime error monitoring and performance tracing, configured to stay within the free tier (5k errors/month, 10k transactions/month, 50 replays/month) while maximising signal quality.

**Capture strategy:** Global `ErrorBoundary` catches unknown errors. Explicit `Sentry.captureException()` calls at Firebase Auth failures, Firestore write failures, Photon API errors (city search), photo upload failures, and report submission failures. This keeps errors actionable — every alert points to a known integration boundary.

**User context:** We attach only the Firebase `uid`, never email or name. The app serves EU users (GDPR applies); uid is pseudonymous. If a user reports a bug, their uid can be looked up in Firebase console.

**Source maps:** Uploaded to Sentry via `@sentry/vite-plugin` during CI build, then deleted from the public `dist/` directory before Firebase Hosting deployment. Readable stack traces without exposing source to the public.

**Session Replay:** `replaysSessionSampleRate: 0`, `replaysOnErrorSampleRate: 1.0`. Replays are recorded only when an error occurs. All `<input>` and `<textarea>` values are masked by default — profile form data (name, bio, contact links) is never captured.

**Performance sampling:** Controlled via `VITE_SENTRY_TRACES_SAMPLE_RATE` env var, defaulting to `1.0`. Can be tuned without a code change when user volume grows.

**Environment gating:** `Sentry.init()` is only called when `import.meta.env.PROD === true`. Development errors never reach Sentry.
