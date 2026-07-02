import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { FeatureFlags } from '../lib/remote-config';

const { defaults, activatedFlags, initRemoteConfigMock, getFlagsMock } =
  vi.hoisted(() => {
    const defaultFlags: FeatureFlags = {
      enable_speaker_registration: true,
      enable_photo_upload: true,
      enable_city_autocomplete: true,
      enable_tag_requests: true,
      enable_gde_status: true,
      enable_report_abuse: true,
      enable_es_locale: true,
      enable_public_directory: true,
      photo_storage_backend: 'supabase',
      directory_layout: 'grid',
    };
    return {
      defaults: defaultFlags,
      activatedFlags: {
        ...defaultFlags,
        enable_photo_upload: false,
        photo_storage_backend: 'firebase',
        directory_layout: 'list',
      } satisfies FeatureFlags,
      initRemoteConfigMock: vi.fn(),
      getFlagsMock: vi.fn(),
    };
  });

vi.mock('../lib/remote-config', () => ({
  FLAG_DEFAULTS: defaults,
  initRemoteConfig: initRemoteConfigMock,
  getFlags: getFlagsMock,
}));

import { useRemoteConfig } from './useRemoteConfig';

beforeEach(() => {
  vi.clearAllMocks();
  getFlagsMock.mockReturnValue(activatedFlags);
});

describe('useRemoteConfig', () => {
  it('starts loading with in-SDK defaults', () => {
    let resolve: (v: boolean) => void = () => {};
    initRemoteConfigMock.mockReturnValue(
      new Promise<boolean>((r) => {
        resolve = r;
      }),
    );
    const { result } = renderHook(() => useRemoteConfig());
    expect(result.current.loading).toBe(true);
    expect(result.current.activated).toBe(false);
    expect(result.current.flags).toEqual(defaults);
    resolve(true);
  });

  it('exposes activated typed flags once init resolves', async () => {
    initRemoteConfigMock.mockResolvedValue(true);
    const { result } = renderHook(() => useRemoteConfig());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.activated).toBe(true);
    expect(result.current.flags).toEqual(activatedFlags);
    // Typed narrowing is available to consumers.
    expect(result.current.flags.directory_layout).toBe('list');
    expect(result.current.flags.photo_storage_backend).toBe('firebase');
  });

  it('stops loading and keeps defaults when nothing was activated', async () => {
    initRemoteConfigMock.mockResolvedValue(false);
    getFlagsMock.mockReturnValue(defaults);
    const { result } = renderHook(() => useRemoteConfig());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.activated).toBe(false);
    expect(result.current.flags).toEqual(defaults);
  });
});
