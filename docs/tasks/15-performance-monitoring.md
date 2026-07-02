# Task 15: Performance Monitoring

**Phase:** 10
**Estimated Effort:** 1 hour
**Dependencies:** 01

---

## Context

Firebase Performance Monitoring auto-instruments all fetch/XHR (Photon, Firestore REST) and page loads. Three custom traces cover the operations that matter: directory fetch, photo upload, and sign-in.

## Goal

Performance init + three custom traces visible in the Firebase console.

---

## Implementation Steps

### 15.1 Init — in `src/lib/perf.ts`
```typescript
import { getPerformance, trace } from 'firebase/performance';
import { app } from './firebase';
export const perf = getPerformance(app);
export const startTrace = (name: string) => { const t = trace(perf, name); t.start(); return t; };
```

### 15.2 Custom traces
- `speakers_fetch` — start before `getPublishedSpeakers()`, stop after data (task 08).
- `photo_upload` — start before Canvas resize, stop after upload resolves (task 07).
- `auth_signin` — start on sign-in click, stop when `onAuthStateChanged` fires a user (task 02).

---

## Corner Cases & Gotchas
- **Prod-only data:** Performance only reports from real deployments (not localhost by default); verify in console after a prod/preview deploy, not dev.
- **Trace leaks:** always `stop()` in a `finally` so failed operations don't leave traces open.
- **Auto-instrumentation cost:** it's free; no sampling config needed at this scale.
- **App Check:** Performance data ingestion isn't blocked by Firestore App Check; no special handling.
- **SSR/unsupported:** guard `getPerformance` in non-browser/test envs.

## Definition of Done
- [ ] Performance initialized; auto traces (Photon/Firestore) appear in console.
- [ ] Three custom traces implemented with guaranteed `stop()`.
- [ ] Traces visible in Firebase console after a deploy.
