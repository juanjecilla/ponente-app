import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Hoisted mocks for `firebase/analytics`. We never touch the network:
 * `isSupported` and `getAnalytics` are driven per test.
 */
const { getAnalyticsMock, isSupportedMock, logEventMock } = vi.hoisted(() => ({
  getAnalyticsMock: vi.fn(),
  isSupportedMock: vi.fn(),
  logEventMock: vi.fn(),
}));

vi.mock('firebase/analytics', () => ({
  getAnalytics: getAnalyticsMock,
  isSupported: isSupportedMock,
  logEvent: logEventMock,
}));

vi.mock('./firebase', () => ({ app: { __app: true } }));

/** Sentinel Analytics instance returned by the mocked `getAnalytics`. */
const ANALYTICS = { __analytics: true };

type Module = typeof import('./analytics');
const load = (): Promise<Module> => import('./analytics');

/** Load the module with Analytics initialized as supported (or not). */
const loadInitialized = async (supported = true): Promise<Module> => {
  isSupportedMock.mockResolvedValue(supported);
  const mod = await load();
  await mod.initAnalytics();
  return mod;
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  getAnalyticsMock.mockReturnValue(ANALYTICS);
  isSupportedMock.mockResolvedValue(true);
});

describe('initAnalytics', () => {
  it('initializes from the shared app when supported', async () => {
    const { initAnalytics, isAnalyticsEnabled } = await load();
    await initAnalytics();

    expect(getAnalyticsMock).toHaveBeenCalledWith({ __app: true });
    expect(isAnalyticsEnabled()).toBe(true);
  });

  it('stays disabled when Analytics is unsupported', async () => {
    isSupportedMock.mockResolvedValue(false);
    const { initAnalytics, isAnalyticsEnabled } = await load();
    await initAnalytics();

    expect(getAnalyticsMock).not.toHaveBeenCalled();
    expect(isAnalyticsEnabled()).toBe(false);
  });

  it('stays disabled (never throws) when isSupported rejects', async () => {
    isSupportedMock.mockRejectedValue(new Error('unsupported env'));
    const { initAnalytics, isAnalyticsEnabled } = await load();

    await expect(initAnalytics()).resolves.toBeUndefined();
    expect(isAnalyticsEnabled()).toBe(false);
  });

  it('is idempotent — a second call does not re-init', async () => {
    const { initAnalytics } = await load();
    await initAnalytics();
    await initAnalytics();

    expect(isSupportedMock).toHaveBeenCalledTimes(1);
    expect(getAnalyticsMock).toHaveBeenCalledTimes(1);
  });
});

describe('typed event wrappers (Analytics supported)', () => {
  it('speaker_registered logs with no params', async () => {
    const { trackSpeakerRegistered } = await loadInitialized();
    trackSpeakerRegistered();
    expect(logEventMock).toHaveBeenCalledWith(
      ANALYTICS,
      'speaker_registered',
      undefined,
    );
  });

  it('profile_updated logs with no params', async () => {
    const { trackProfileUpdated } = await loadInitialized();
    trackProfileUpdated();
    expect(logEventMock).toHaveBeenCalledWith(
      ANALYTICS,
      'profile_updated',
      undefined,
    );
  });

  it('tag_requested logs with no params', async () => {
    const { trackTagRequested } = await loadInitialized();
    trackTagRequested();
    expect(logEventMock).toHaveBeenCalledWith(
      ANALYTICS,
      'tag_requested',
      undefined,
    );
  });

  it('speaker_searched logs the filter type', async () => {
    const { trackSpeakerSearched } = await loadInitialized();
    trackSpeakerSearched({ filterType: 'city' });
    expect(logEventMock).toHaveBeenCalledWith(ANALYTICS, 'speaker_searched', {
      filterType: 'city',
    });
  });

  it('speaker_profile_viewed logs the uid', async () => {
    const { trackSpeakerProfileViewed } = await loadInitialized();
    trackSpeakerProfileViewed({ uid: 'uid-123' });
    expect(logEventMock).toHaveBeenCalledWith(
      ANALYTICS,
      'speaker_profile_viewed',
      { uid: 'uid-123' },
    );
  });

  it('speaker_reported logs the reason', async () => {
    const { trackSpeakerReported } = await loadInitialized();
    trackSpeakerReported({ reason: 'spam' });
    expect(logEventMock).toHaveBeenCalledWith(ANALYTICS, 'speaker_reported', {
      reason: 'spam',
    });
  });

  it('locale_changed logs the locale', async () => {
    const { trackLocaleChanged } = await loadInitialized();
    trackLocaleChanged({ locale: 'es' });
    expect(logEventMock).toHaveBeenCalledWith(ANALYTICS, 'locale_changed', {
      locale: 'es',
    });
  });
});

describe('graceful no-op when Analytics is unavailable', () => {
  it('wrappers do not call logEvent and never throw before init', async () => {
    const {
      trackSpeakerRegistered,
      trackSpeakerSearched,
      trackSpeakerProfileViewed,
    } = await load();

    expect(() => trackSpeakerRegistered()).not.toThrow();
    expect(() => trackSpeakerSearched({ filterType: 'topic' })).not.toThrow();
    expect(() => trackSpeakerProfileViewed({ uid: 'x' })).not.toThrow();
    expect(logEventMock).not.toHaveBeenCalled();
  });

  it('wrappers no-op after init in an unsupported environment', async () => {
    const {
      trackProfileUpdated,
      trackTagRequested,
      trackSpeakerReported,
      trackLocaleChanged,
    } = await loadInitialized(false);

    trackProfileUpdated();
    trackTagRequested();
    trackSpeakerReported({ reason: 'fake' });
    trackLocaleChanged({ locale: 'en' });

    expect(logEventMock).not.toHaveBeenCalled();
  });
});
