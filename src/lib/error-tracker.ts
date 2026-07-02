// The ONLY module allowed to import Sentry or Firebase Analytics directly.
// Everything else reports errors through the `errorTracker` singleton so the
// underlying providers stay swappable. See ADR 0002 + docs/tasks/13-observability.md.
import * as Sentry from '@sentry/react';
import {
  getAnalytics,
  isSupported,
  logEvent,
  setUserId,
  type Analytics,
} from 'firebase/analytics';
import { app } from './firebase';

/** A destination errors can be fanned out to (Sentry, Analytics, ...). */
export interface ErrorProvider {
  captureException(error: unknown, context?: Record<string, unknown>): void;
  setUser(uid: string | null): void;
}

/** A provider that can be initialized once before use. */
interface InitializableProvider extends ErrorProvider {
  init(): void | Promise<void>;
}

/** Best-effort human-readable description of an unknown thrown value. */
function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

/**
 * Primary crash reporting + performance tracing via Sentry.
 * Initialized only in production builds when a DSN is configured, so dev noise
 * never reaches Sentry and absent env vars simply make it a no-op (ADR 0002).
 */
export class SentryProvider implements InitializableProvider {
  private enabled = false;

  init(): void {
    const dsn = import.meta.env.VITE_SENTRY_DSN;
    if (!dsn || !import.meta.env.PROD) return;

    const tracesSampleRate = Number(
      import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? '1.0',
    );

    Sentry.init({
      dsn,
      tracesSampleRate: Number.isFinite(tracesSampleRate)
        ? tracesSampleRate
        : 1.0,
      // Record replays only when an error occurs; mask all input to avoid PII.
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 1.0,
      integrations: [
        Sentry.replayIntegration({ maskAllInputs: true, maskAllText: false }),
      ],
    });
    this.enabled = true;
  }

  captureException(error: unknown, context?: Record<string, unknown>): void {
    if (!this.enabled) return;
    Sentry.captureException(error, context ? { extra: context } : undefined);
  }

  setUser(uid: string | null): void {
    if (!this.enabled) return;
    // GDPR: attach the pseudonymous uid only — never email or name (ADR 0002).
    Sentry.setUser(uid ? { id: uid } : null);
  }
}

/**
 * Secondary reporting: logs an `exception` event to Firebase Analytics.
 * No-ops when Analytics is unsupported in the current environment.
 */
export class AnalyticsProvider implements InitializableProvider {
  private analytics: Analytics | null = null;

  async init(): Promise<void> {
    try {
      if (await isSupported()) {
        this.analytics = getAnalytics(app);
      }
    } catch {
      this.analytics = null;
    }
  }

  captureException(error: unknown, context?: Record<string, unknown>): void {
    if (!this.analytics) return;
    logEvent(this.analytics, 'exception', {
      description: describeError(error),
      fatal: context?.fatal === true,
    });
  }

  setUser(uid: string | null): void {
    if (!this.analytics) return;
    setUserId(this.analytics, uid);
  }
}

/** Fans a single error/user event out to every configured provider. */
export class ErrorTracker implements ErrorProvider {
  private readonly providers: ErrorProvider[];

  constructor(providers: ErrorProvider[]) {
    this.providers = providers;
  }

  captureException(error: unknown, context?: Record<string, unknown>): void {
    for (const provider of this.providers) {
      provider.captureException(error, context);
    }
  }

  setUser(uid: string | null): void {
    for (const provider of this.providers) {
      provider.setUser(uid);
    }
  }
}

const providers: InitializableProvider[] = [
  new SentryProvider(),
  new AnalyticsProvider(),
];

/** App-wide error tracker. The only public surface for reporting errors. */
export const errorTracker = new ErrorTracker(providers);

/**
 * Initialize every provider. Resilient: individual providers no-op when their
 * env vars are absent, and a failing provider never blocks the others.
 * Call once, before rendering.
 */
export async function initErrorTracker(): Promise<void> {
  await Promise.all(
    providers.map(async (provider) => {
      try {
        await provider.init();
      } catch {
        // A provider failing to initialize must never crash the app.
      }
    }),
  );
}
