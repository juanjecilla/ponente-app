import {
  initializePerformance,
  trace as fbTrace,
  type FirebasePerformance,
  type PerformanceTrace,
} from 'firebase/performance';
import { app } from './firebase';

/**
 * Firebase Performance Monitoring — custom traces.
 *
 * Performance Monitoring auto-instruments all fetch/XHR (Photon, Firestore
 * REST) and page loads for free; on top of that we expose a handful of named
 * custom traces for the operations that matter (see {@link TraceName}).
 *
 * Everything here is resilient: `initializePerformance` needs a browser and can
 * throw (SSR/tests/unsupported), so we memoize both success and failure and
 * every helper degrades to a silent no-op rather than throwing. Performance
 * only reports from real deployments — expect no data on localhost/CI.
 *
 * This is a lib module: it provides the trace helpers only. Wiring a trace
 * around an actual operation belongs to the corresponding feature task.
 *
 * See docs/tasks/15-performance-monitoring.md.
 */

/**
 * The custom traces this app records. Kept as a closed union so callers can't
 * fat-finger a trace name and silently split metrics across two labels.
 *
 * - `speakers_fetch` — the published-speakers directory load (task 08).
 * - `photo_upload` — Canvas resize + upload of a profile photo (task 07).
 * - `auth_signin` — sign-in click → `onAuthStateChanged` fires a user (task 02).
 */
export type TraceName = 'speakers_fetch' | 'photo_upload' | 'auth_signin';

/**
 * Lazily-initialized Performance singleton. Memoizes success (`perf`) and
 * failure (`initFailed`) so a single failed init doesn't retry on every call.
 */
let perf: FirebasePerformance | null = null;
let initFailed = false;

const getPerf = (): FirebasePerformance | null => {
  if (perf !== null || initFailed) return perf;
  // Performance requires a browser; bail out cleanly in SSR/Node/test envs.
  if (typeof window === 'undefined') {
    initFailed = true;
    return null;
  }
  try {
    // Auto-collection is free at this scale, so keep both on with no sampling:
    // `instrumentationEnabled` covers the automatic network/page-load traces,
    // `dataCollectionEnabled` covers the custom traces below.
    perf = initializePerformance(app, {
      dataCollectionEnabled: true,
      instrumentationEnabled: true,
    });
    return perf;
  } catch {
    initFailed = true;
    return null;
  }
};

/**
 * Eagerly initialize Performance Monitoring. Safe to call once at startup;
 * returns the instance, or `null` when Performance is unavailable. Never throws.
 */
export const initPerformance = (): FirebasePerformance | null => getPerf();

/**
 * Start a custom trace. Returns the live {@link PerformanceTrace}, or `null`
 * when Performance is unavailable (dev/CI/unsupported). Never throws.
 *
 * Prefer {@link measureTrace} when you can wrap the whole operation; reach for
 * this + {@link stopTrace} only when start and stop live in different callbacks
 * (e.g. `auth_signin`, which stops inside an `onAuthStateChanged` listener).
 */
export const startTrace = (name: TraceName): PerformanceTrace | null => {
  const instance = getPerf();
  if (instance === null) return null;
  try {
    const t = fbTrace(instance, name);
    t.start();
    return t;
  } catch {
    return null;
  }
};

/**
 * Stop a trace previously returned by {@link startTrace}. No-ops on `null` (the
 * unavailable case) and swallows any error so a failed stop never crashes the
 * operation it was measuring. Never throws.
 */
export const stopTrace = (t: PerformanceTrace | null): void => {
  if (t === null) return;
  try {
    t.stop();
  } catch {
    // A failed stop must never surface to the caller.
  }
};

/**
 * Measure `fn` under a custom trace, starting before it runs and stopping when
 * it settles. Works for both synchronous functions and ones returning a
 * promise, and always stops the trace — even when `fn` throws or rejects — so
 * traces never leak. The result (or rejection) of `fn` is passed through
 * unchanged. A no-op wrapper when Performance is unavailable.
 */
export function measureTrace<T>(name: TraceName, fn: () => T): T {
  const t = startTrace(name);
  let result: T;
  try {
    result = fn();
  } catch (error) {
    stopTrace(t);
    throw error;
  }
  if (result instanceof Promise) {
    return result.finally(() => {
      stopTrace(t);
    }) as T;
  }
  stopTrace(t);
  return result;
}
