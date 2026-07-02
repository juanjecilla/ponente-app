import {
  getAnalytics,
  isSupported,
  logEvent,
  type Analytics,
} from 'firebase/analytics';
import { app } from './firebase';
import type { Report } from '../types';

/**
 * Typed Firebase Analytics (GA4) product-event API.
 *
 * This module owns the app's *product* events (speaker registered, profile
 * viewed, search, ...). Crash/`exception` reporting and Analytics user identity
 * are intentionally NOT here — they live in `lib/error-tracker.ts`'s
 * `AnalyticsProvider` so the observability providers stay swappable (ADR 0002).
 * Do not duplicate `exception` logging or `setUserId` here.
 *
 * Analytics throws in unsupported / SSR / test environments, so init is guarded
 * by `isSupported()` and every wrapper no-ops (never throws) when Analytics is
 * unavailable — dev, CI and offline all degrade to silence.
 *
 * See docs/tasks/16-analytics.md and docs/ARCHITECTURE.md.
 */

/** Which facet the directory was filtered by (task 08). */
export type SpeakerFilterType = 'city' | 'tier' | 'topic';

/** Abuse-report reasons — mirrors {@link Report.reason} (task 09). */
export type ReportReason = Report['reason'];

/** Supported UI locales (task 10). */
export type AppLocale = 'en' | 'es';

/**
 * The app's known Analytics events and their typed params. A value of
 * `undefined` marks a param-less event. `keyof` this map is the single source
 * of truth for valid event names; wrapper signatures derive their params from
 * it, so the map and the public API can never drift.
 *
 * PII policy: never log names/emails as params; the pseudonymous `uid` is
 * acceptable (ADR 0002).
 */
export interface AnalyticsEventParams {
  /** First successful publish of a profile (task 04). */
  speaker_registered: undefined;
  /** A subsequent save of an already-published profile (task 04). */
  profile_updated: undefined;
  /** Directory filter changed, debounced (task 08). */
  speaker_searched: { filterType: SpeakerFilterType };
  /** A public speaker profile was viewed — A/B goal metric (tasks 08, 18). */
  speaker_profile_viewed: { uid: string };
  /** A missing-tag request was submitted (task 06). */
  tag_requested: undefined;
  /** An abuse report was submitted (task 09). */
  speaker_reported: { reason: ReportReason };
  /** The UI locale was switched (task 10). */
  locale_changed: { locale: AppLocale };
}

/** Every valid Analytics event name. */
export type AnalyticsEventName = keyof AnalyticsEventParams;

/** Firebase's custom-event param shape, narrowed to serializable scalars. */
type EventParams = Record<string, string | number | boolean>;

/**
 * Lazily-initialized Analytics singleton. `null` until a successful
 * {@link initAnalytics}, and stays `null` where Analytics is unsupported.
 */
let analytics: Analytics | null = null;
let initialized = false;

/**
 * Initialize Firebase Analytics, guarded by `isSupported()`. Idempotent and
 * resilient: safe to call more than once, and swallows any failure so an
 * unsupported environment simply leaves Analytics disabled. Call once at
 * startup, before the first event fires; wrappers no-op until it resolves.
 */
export const initAnalytics = async (): Promise<void> => {
  if (initialized) return;
  initialized = true;
  try {
    if (await isSupported()) {
      analytics = getAnalytics(app);
    }
  } catch {
    analytics = null;
  }
};

/** True once Analytics is initialized and supported in this environment. */
export const isAnalyticsEnabled = (): boolean => analytics !== null;

/** Log a known event to Analytics, or no-op when Analytics is unavailable. */
function emit(event: AnalyticsEventName, params?: EventParams): void {
  if (analytics === null) return;
  logEvent(analytics, event, params);
}

/* ---- Typed event wrappers ----------------------------------------------- */

/** Fired on a speaker's first successful publish. */
export const trackSpeakerRegistered = (): void => emit('speaker_registered');

/** Fired when an already-published profile is saved again. */
export const trackProfileUpdated = (): void => emit('profile_updated');

/** Fired (debounced) when the directory filter changes. */
export const trackSpeakerSearched = (
  params: AnalyticsEventParams['speaker_searched'],
): void => emit('speaker_searched', params);

/** Fired on every public speaker-profile view (A/B goal metric). */
export const trackSpeakerProfileViewed = (
  params: AnalyticsEventParams['speaker_profile_viewed'],
): void => emit('speaker_profile_viewed', params);

/** Fired when a missing-tag request is submitted. */
export const trackTagRequested = (): void => emit('tag_requested');

/** Fired when an abuse report is submitted. */
export const trackSpeakerReported = (
  params: AnalyticsEventParams['speaker_reported'],
): void => emit('speaker_reported', params);

/** Fired when the UI locale is switched. */
export const trackLocaleChanged = (
  params: AnalyticsEventParams['locale_changed'],
): void => emit('locale_changed', params);
