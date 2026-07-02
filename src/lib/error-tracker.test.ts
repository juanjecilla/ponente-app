import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ErrorProvider } from './error-tracker';

// Mock every SDK at the boundary — never hit the network.
vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
  setUser: vi.fn(),
  replayIntegration: vi.fn(() => ({ name: 'Replay' })),
}));

vi.mock('firebase/analytics', () => ({
  getAnalytics: vi.fn(() => ({ __analytics: true })),
  isSupported: vi.fn(),
  logEvent: vi.fn(),
  setUserId: vi.fn(),
}));

vi.mock('./firebase', () => ({ app: { __app: true } }));

import * as Sentry from '@sentry/react';
import {
  getAnalytics,
  isSupported,
  logEvent,
  setUserId,
} from 'firebase/analytics';
import {
  ErrorTracker,
  SentryProvider,
  AnalyticsProvider,
  errorTracker,
  initErrorTracker,
} from './error-tracker';

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('ErrorTracker (fan-out)', () => {
  function makeProvider(): ErrorProvider {
    return { captureException: vi.fn(), setUser: vi.fn() };
  }

  it('forwards captureException to every provider with context', () => {
    const a = makeProvider();
    const b = makeProvider();
    const tracker = new ErrorTracker([a, b]);
    const err = new Error('boom');
    const ctx = { boundary: 'root' };

    tracker.captureException(err, ctx);

    expect(a.captureException).toHaveBeenCalledWith(err, ctx);
    expect(b.captureException).toHaveBeenCalledWith(err, ctx);
  });

  it('forwards setUser to every provider', () => {
    const a = makeProvider();
    const b = makeProvider();
    const tracker = new ErrorTracker([a, b]);

    tracker.setUser('uid-123');
    expect(a.setUser).toHaveBeenCalledWith('uid-123');
    expect(b.setUser).toHaveBeenCalledWith('uid-123');

    tracker.setUser(null);
    expect(a.setUser).toHaveBeenLastCalledWith(null);
    expect(b.setUser).toHaveBeenLastCalledWith(null);
  });

  it('no-ops cleanly with zero providers', () => {
    const tracker = new ErrorTracker([]);
    expect(() => tracker.captureException(new Error('x'))).not.toThrow();
    expect(() => tracker.setUser(null)).not.toThrow();
  });
});

describe('SentryProvider', () => {
  it('no-ops (never inits) when DSN is absent', () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('VITE_SENTRY_DSN', '');

    const provider = new SentryProvider();
    provider.init();
    provider.captureException(new Error('x'), { a: 1 });
    provider.setUser('uid');

    expect(Sentry.init).not.toHaveBeenCalled();
    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(Sentry.setUser).not.toHaveBeenCalled();
  });

  it('does not init in dev even with a DSN present', () => {
    vi.stubEnv('PROD', false);
    vi.stubEnv('VITE_SENTRY_DSN', 'https://key@example.ingest.sentry.io/1');

    const provider = new SentryProvider();
    provider.init();

    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it('inits with masked replay + traces sample rate in prod', () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('VITE_SENTRY_DSN', 'https://key@example.ingest.sentry.io/1');
    vi.stubEnv('VITE_SENTRY_TRACES_SAMPLE_RATE', '0.5');

    const provider = new SentryProvider();
    provider.init();

    expect(Sentry.init).toHaveBeenCalledTimes(1);
    const config = vi.mocked(Sentry.init).mock.calls[0]![0]!;
    expect(config.dsn).toBe('https://key@example.ingest.sentry.io/1');
    expect(config.tracesSampleRate).toBe(0.5);
    expect(config.replaysSessionSampleRate).toBe(0);
    expect(config.replaysOnErrorSampleRate).toBe(1.0);
    expect(Sentry.replayIntegration).toHaveBeenCalledWith({
      maskAllInputs: true,
      maskAllText: false,
    });
  });

  it('defaults tracesSampleRate to 1.0 when unset or invalid', () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('VITE_SENTRY_DSN', 'https://key@example.ingest.sentry.io/1');
    vi.stubEnv('VITE_SENTRY_TRACES_SAMPLE_RATE', 'not-a-number');

    const provider = new SentryProvider();
    provider.init();

    const config = vi.mocked(Sentry.init).mock.calls[0]![0]!;
    expect(config.tracesSampleRate).toBe(1.0);
  });

  it('captures exceptions and sets uid-only user once enabled', () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('VITE_SENTRY_DSN', 'https://key@example.ingest.sentry.io/1');

    const provider = new SentryProvider();
    provider.init();

    const err = new Error('kaboom');
    provider.captureException(err, { boundary: 'root' });
    expect(Sentry.captureException).toHaveBeenCalledWith(err, {
      extra: { boundary: 'root' },
    });

    provider.captureException(err);
    expect(Sentry.captureException).toHaveBeenLastCalledWith(err, undefined);

    provider.setUser('uid-9');
    expect(Sentry.setUser).toHaveBeenCalledWith({ id: 'uid-9' });

    provider.setUser(null);
    expect(Sentry.setUser).toHaveBeenLastCalledWith(null);
  });
});

describe('AnalyticsProvider', () => {
  it('logs an exception event when analytics is supported', async () => {
    vi.mocked(isSupported).mockResolvedValue(true);
    const provider = new AnalyticsProvider();
    await provider.init();

    expect(getAnalytics).toHaveBeenCalledWith({ __app: true });

    provider.captureException(new Error('bad'), { fatal: true });
    expect(logEvent).toHaveBeenCalledWith({ __analytics: true }, 'exception', {
      description: 'bad',
      fatal: true,
    });

    provider.setUser('uid-42');
    expect(setUserId).toHaveBeenCalledWith({ __analytics: true }, 'uid-42');
  });

  it('describes non-Error values (string, object, circular)', async () => {
    vi.mocked(isSupported).mockResolvedValue(true);
    const provider = new AnalyticsProvider();
    await provider.init();

    provider.captureException('plain string');
    expect(vi.mocked(logEvent).mock.calls[0]![2]).toMatchObject({
      description: 'plain string',
      fatal: false,
    });

    provider.captureException({ code: 42 });
    expect(vi.mocked(logEvent).mock.calls[1]![2]).toMatchObject({
      description: '{"code":42}',
    });

    const circular: Record<string, unknown> = {};
    circular.self = circular;
    provider.captureException(circular);
    expect(
      (vi.mocked(logEvent).mock.calls[2]![2] as { description: string })
        .description,
    ).toContain('object');
  });

  it('no-ops when analytics is unsupported', async () => {
    vi.mocked(isSupported).mockResolvedValue(false);
    const provider = new AnalyticsProvider();
    await provider.init();

    expect(getAnalytics).not.toHaveBeenCalled();
    provider.captureException(new Error('x'));
    provider.setUser('uid');
    expect(logEvent).not.toHaveBeenCalled();
    expect(setUserId).not.toHaveBeenCalled();
  });

  it('no-ops when isSupported rejects', async () => {
    vi.mocked(isSupported).mockRejectedValue(new Error('unsupported env'));
    const provider = new AnalyticsProvider();
    await provider.init();

    provider.captureException(new Error('x'));
    expect(logEvent).not.toHaveBeenCalled();
  });
});

describe('errorTracker singleton + initErrorTracker', () => {
  it('exposes a ready-to-use singleton', () => {
    expect(errorTracker).toBeInstanceOf(ErrorTracker);
    expect(() => errorTracker.captureException(new Error('x'))).not.toThrow();
  });

  it('initializes providers resiliently when env vars are absent', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', '');
    vi.mocked(isSupported).mockResolvedValue(false);

    await expect(initErrorTracker()).resolves.toBeUndefined();
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it('does not reject when a provider init throws', async () => {
    vi.mocked(isSupported).mockRejectedValue(new Error('boom'));
    await expect(initErrorTracker()).resolves.toBeUndefined();
  });
});
