# Task 13: Observability (ErrorTracker + Sentry + Analytics)

**Phase:** 8
**Estimated Effort:** 3 hours
**Dependencies:** 01 (Sentry init can precede Analytics wiring); 16 provides the Analytics instance.
**See:** ADR 0002.

---

## Context

Errors flow through an `ErrorTracker` abstraction that fans out to multiple providers — `SentryProvider` (primary crash reporting + perf) and `AnalyticsProvider` (logs an `exception` event to Firebase Analytics). Nothing imports Sentry or Analytics directly for error tracking. Configured to stay within Sentry's free tier and to respect GDPR (uid only).

## Goal

`errorTracker` singleton with both providers, a global `<ErrorBoundary>`, explicit captures at integration boundaries, and CI source-map upload.

---

## Implementation Steps

### 13.1 Abstraction — `src/lib/error-tracker.ts`
```typescript
export interface ErrorProvider {
  captureException(e: unknown, ctx?: Record<string, unknown>): void;
  setUser(uid: string | null): void;
}
class ErrorTracker {
  constructor(private providers: ErrorProvider[]) {}
  captureException(e: unknown, ctx?: Record<string, unknown>) { this.providers.forEach((p) => p.captureException(e, ctx)); }
  setUser(uid: string | null) { this.providers.forEach((p) => p.setUser(uid)); }
}
export const errorTracker = new ErrorTracker([/* sentryProvider, analyticsProvider */]);
```

### 13.2 SentryProvider
- `@sentry/react` + `@sentry/vite-plugin`.
- Init **prod-only** (`import.meta.env.PROD`): DSN from env, `replaysSessionSampleRate: 0`, `replaysOnErrorSampleRate: 1.0`, mask all inputs, `tracesSampleRate` from `VITE_SENTRY_TRACES_SAMPLE_RATE`.
- `setUser` attaches **uid only** (no email/name — GDPR, ADR 0002).

### 13.3 AnalyticsProvider
- `captureException` → `logEvent(analytics, 'exception', { description, fatal })` (analytics from task 16).
- `setUser` → `setUserId(analytics, uid)`.

### 13.4 Boundary — `src/components/shared/ErrorBoundary.tsx`
- Wrap app in `main.tsx` (Sentry's `ErrorBoundary` or custom calling `errorTracker`). Friendly fallback UI (i18n).

### 13.5 Explicit captures
- Firebase auth failures, Firestore write failures, Photon errors, photo upload failures, report submit failures → `errorTracker.captureException(e, { boundary: '...' })`.

### 13.6 Source maps
- `sentryVitePlugin` uploads source maps in CI build, then **deletes them from `dist/`** before deploy. Needs `SENTRY_AUTH_TOKEN` secret.

---

## Corner Cases & Gotchas
- **Circular init:** AnalyticsProvider needs the Analytics instance (task 16) and the ErrorBoundary needs errorTracker — initialize providers after Firebase/Analytics init; until then errorTracker can hold a no-op provider so tasks 02+ compile.
- **Dev noise:** Sentry off in dev (`import.meta.env.PROD`); AnalyticsProvider also no-ops if Analytics unsupported (e.g. SSR/unsupported env) — guard with `isSupported()`.
- **PII leakage:** never pass email/name to Sentry; replay masks inputs — verify form fields are masked.
- **Source maps exposure:** ensure the delete-after-upload step runs, or source is public on Hosting.
- **Free-tier budget:** error-only replay + sampling keeps within 5k errors / 50 replays month (ADR 0002).
- **Double reporting:** ErrorBoundary + explicit capture of the same error — acceptable, but avoid wrapping then re-throwing then capturing again.

## Definition of Done
- [ ] `errorTracker` fans out to Sentry + Analytics providers.
- [ ] Global ErrorBoundary with i18n fallback.
- [ ] Explicit captures at all named integration boundaries.
- [ ] uid-only user context; inputs masked; prod-only Sentry.
- [ ] CI uploads + deletes source maps (`SENTRY_AUTH_TOKEN`).
- [ ] Triggered test error appears in Sentry + as `exception` Analytics event.
