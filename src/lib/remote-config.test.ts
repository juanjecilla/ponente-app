import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Hoisted mock functions for `firebase/remote-config`. We never hit the
 * network: `getValue` is driven by an in-memory store per test.
 */
const { getRemoteConfigMock, fetchAndActivateMock, getValueMock } = vi.hoisted(
  () => ({
    getRemoteConfigMock: vi.fn(),
    fetchAndActivateMock: vi.fn(),
    getValueMock: vi.fn(),
  }),
);

vi.mock('firebase/remote-config', () => ({
  getRemoteConfig: getRemoteConfigMock,
  fetchAndActivate: fetchAndActivateMock,
  getValue: getValueMock,
}));

vi.mock('./firebase', () => ({ app: { name: 'test-app' } }));

/** Build a minimal Firebase `Value` stub from a raw string. */
const value = (raw: string) => ({
  asString: () => raw,
  asBoolean: () => raw === 'true' || raw === '1',
  asNumber: () => Number(raw),
  getSource: () => 'remote' as const,
});

/** Fresh RemoteConfig-like instance so `settings`/`defaultConfig` are isolated. */
const freshRc = () => ({
  settings: { minimumFetchIntervalMillis: 0, fetchTimeoutMillis: 0 },
  defaultConfig: {} as Record<string, string | number | boolean>,
});

/** Configure `getValue` from a key→raw-string map (missing keys throw). */
const setRemoteValues = (values: Record<string, string>) => {
  getValueMock.mockImplementation((_rc: unknown, key: string) => {
    const raw = values[key];
    if (raw === undefined) throw new Error(`no value for ${key}`);
    return value(raw);
  });
};

type Module = typeof import('./remote-config');
const load = (): Promise<Module> => import('./remote-config');

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  getRemoteConfigMock.mockReturnValue(freshRc());
  fetchAndActivateMock.mockResolvedValue(true);
  setRemoteValues({});
});

describe('boolean accessors', () => {
  it('parses a truthy remote value as true', async () => {
    setRemoteValues({ enable_photo_upload: 'true' });
    const { getEnablePhotoUpload } = await load();
    expect(getEnablePhotoUpload()).toBe(true);
  });

  it('parses a falsy remote value as false (coercion, not default)', async () => {
    setRemoteValues({ enable_photo_upload: 'false' });
    const { getEnablePhotoUpload } = await load();
    expect(getEnablePhotoUpload()).toBe(false);
  });

  it('each boolean accessor coerces via asBoolean', async () => {
    setRemoteValues({
      enable_speaker_registration: 'false',
      enable_city_autocomplete: 'false',
      enable_tag_requests: 'false',
      enable_gde_status: 'false',
      enable_report_abuse: 'false',
      enable_es_locale: 'false',
      enable_public_directory: 'false',
    });
    const m = await load();
    expect(m.getEnableSpeakerRegistration()).toBe(false);
    expect(m.getEnableCityAutocomplete()).toBe(false);
    expect(m.getEnableTagRequests()).toBe(false);
    expect(m.getEnableGdeStatus()).toBe(false);
    expect(m.getEnableReportAbuse()).toBe(false);
    expect(m.getEnableEsLocale()).toBe(false);
    expect(m.getEnablePublicDirectory()).toBe(false);
  });

  it('falls back to the default when getValue throws for a missing key', async () => {
    setRemoteValues({}); // every key throws
    const { getEnableSpeakerRegistration } = await load();
    expect(getEnableSpeakerRegistration()).toBe(true); // default
  });
});

describe('string enum accessors', () => {
  it('returns a valid photo_storage_backend value', async () => {
    setRemoteValues({ photo_storage_backend: 'firebase' });
    const { getPhotoStorageBackend } = await load();
    expect(getPhotoStorageBackend()).toBe('firebase');
  });

  it('falls back to the default for an invalid photo_storage_backend value', async () => {
    setRemoteValues({ photo_storage_backend: 'aws' });
    const { getPhotoStorageBackend } = await load();
    expect(getPhotoStorageBackend()).toBe('supabase');
  });

  it('returns a valid directory_layout value', async () => {
    setRemoteValues({ directory_layout: 'list' });
    const { getDirectoryLayout } = await load();
    expect(getDirectoryLayout()).toBe('list');
  });

  it('falls back to the default for an invalid directory_layout value', async () => {
    setRemoteValues({ directory_layout: 'masonry' });
    const { getDirectoryLayout } = await load();
    expect(getDirectoryLayout()).toBe('grid');
  });
});

describe('getFlags', () => {
  it('returns a fully typed snapshot honoring remote overrides', async () => {
    setRemoteValues({
      enable_speaker_registration: 'true',
      enable_photo_upload: 'false',
      enable_city_autocomplete: 'true',
      enable_tag_requests: 'true',
      enable_gde_status: 'true',
      enable_report_abuse: 'false',
      enable_es_locale: 'true',
      enable_public_directory: 'true',
      photo_storage_backend: 'firebase',
      directory_layout: 'list',
    });
    const { getFlags } = await load();
    expect(getFlags()).toEqual({
      enable_speaker_registration: true,
      enable_photo_upload: false,
      enable_city_autocomplete: true,
      enable_tag_requests: true,
      enable_gde_status: true,
      enable_report_abuse: false,
      enable_es_locale: true,
      enable_public_directory: true,
      photo_storage_backend: 'firebase',
      directory_layout: 'list',
    });
  });

  it('returns all defaults when nothing is set', async () => {
    const { getFlags, FLAG_DEFAULTS } = await load();
    expect(getFlags()).toEqual(FLAG_DEFAULTS);
  });
});

describe('initRemoteConfig', () => {
  it('initializes settings + defaults and returns the activation result', async () => {
    const instance = freshRc();
    getRemoteConfigMock.mockReturnValue(instance);
    fetchAndActivateMock.mockResolvedValue(true);
    const { initRemoteConfig, FLAG_DEFAULTS } = await load();

    await expect(initRemoteConfig()).resolves.toBe(true);
    expect(fetchAndActivateMock).toHaveBeenCalledWith(instance);
    expect(instance.defaultConfig).toEqual(FLAG_DEFAULTS);
    expect(instance.settings.minimumFetchIntervalMillis).toBeGreaterThan(0);
  });

  it('memoizes the instance (init runs once across calls)', async () => {
    const { initRemoteConfig, getFlags } = await load();
    await initRemoteConfig();
    getFlags();
    expect(getRemoteConfigMock).toHaveBeenCalledTimes(1);
  });

  it('resolves false (never throws) when fetchAndActivate rejects', async () => {
    fetchAndActivateMock.mockRejectedValue(new Error('offline'));
    const { initRemoteConfig } = await load();
    await expect(initRemoteConfig()).resolves.toBe(false);
  });
});

describe('resilience when Remote Config is unavailable', () => {
  beforeEach(() => {
    getRemoteConfigMock.mockImplementation(() => {
      throw new Error('Remote Config not supported in this environment');
    });
  });

  it('initRemoteConfig resolves false and never calls fetchAndActivate', async () => {
    const { initRemoteConfig } = await load();
    await expect(initRemoteConfig()).resolves.toBe(false);
    expect(fetchAndActivateMock).not.toHaveBeenCalled();
  });

  it('accessors return in-SDK defaults', async () => {
    const { getFlags, FLAG_DEFAULTS } = await load();
    expect(getFlags()).toEqual(FLAG_DEFAULTS);
  });

  it('memoizes the failure (getRemoteConfig attempted once)', async () => {
    const { getEnablePhotoUpload, getDirectoryLayout } = await load();
    getEnablePhotoUpload();
    getDirectoryLayout();
    expect(getRemoteConfigMock).toHaveBeenCalledTimes(1);
  });
});
